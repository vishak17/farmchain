// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Produce sensitivity categories used across the FarmChain supply chain.
enum ProduceCategory {
    STANDARD,          // 0 – general fruits & vegetables
    HIGH_SENSITIVITY,  // 1 – leafy greens, berries, seafood
    HIGH_TOLERANCE     // 2 – root vegetables, grains, dried goods
}

/// @title  FRSEngine – Freshness Rate Score Calculation Library
/// @notice Pure math library for computing FRS scores, grades, anomaly
///         detection, and predictive expiry estimates.  No storage, no
///         external dependencies.
library FRSEngine {

    // ───────────────────────────────────────────────────
    //  a) Core FRS Calculation
    // ───────────────────────────────────────────────────

    /// @notice Calculate the Freshness Rate Score in basis points.
    /// @param  wOriginGrams  Weight at origin (grams).
    /// @param  wDestGrams    Weight at destination (grams).
    /// @return frsBasisPoints FRS expressed as basis points (9640 = 96.40%).
    function calculateFRS(
        uint256 wOriginGrams,
        uint256 wDestGrams
    ) internal pure returns (uint256 frsBasisPoints) {
        require(wOriginGrams > 0, "Origin weight cannot be zero");
        require(wDestGrams <= wOriginGrams, "Dest weight exceeds origin");

        frsBasisPoints = (wDestGrams * 10000) / wOriginGrams;
    }

    // ───────────────────────────────────────────────────
    //  b) Grade Lookup
    // ───────────────────────────────────────────────────

    /// @notice Derive a human-readable grade from an FRS value.
    /// @param  frsBasisPoints The FRS score (0 – 10 000).
    /// @param  cat            Produce category that selects the grading table.
    /// @return grade          Letter grade  (A+, A, B, C, D).
    /// @return label          Short label   (Premium, Fresh, …).
    /// @return action         Recommended action text.
    /// @return shouldDispute  True when the score warrants a payment dispute.
    function getGrade(
        uint256 frsBasisPoints,
        ProduceCategory cat
    )
        internal
        pure
        returns (
            string memory grade,
            string memory label,
            string memory action,
            bool shouldDispute
        )
    {
        if (cat == ProduceCategory.HIGH_SENSITIVITY) {
            return _gradeHighSensitivity(frsBasisPoints);
        } else if (cat == ProduceCategory.HIGH_TOLERANCE) {
            return _gradeHighTolerance(frsBasisPoints);
        } else {
            return _gradeStandard(frsBasisPoints);
        }
    }

    // ── STANDARD grading table ──────────────────────────
    function _gradeStandard(uint256 frs)
        private
        pure
        returns (string memory, string memory, string memory, bool)
    {
        if (frs >= 9800) return ("A+", "Premium",    "Full price - top shelf",                  false);
        if (frs >= 9500) return ("A",  "Fresh",      "Full price - marketable",                 false);
        if (frs >= 9000) return ("B",  "Acceptable", "Slight discount - sell within 2 days",    false);
        if (frs >= 8500) return ("C",  "Reduced",    "Significant discount - sell today",       false);
        return                  ("D",  "Rejected",   "Dispute triggered - no full payment",     true);
    }

    // ── HIGH_SENSITIVITY grading table ──────────────────
    function _gradeHighSensitivity(uint256 frs)
        private
        pure
        returns (string memory, string memory, string memory, bool)
    {
        if (frs >= 9800) return ("A+", "Premium",    "Full price",                              false);
        if (frs >= 9600) return ("A",  "Fresh",      "Full price",                              false);
        if (frs >= 9300) return ("B",  "Acceptable", "Moderate discount",                       false);
        if (frs >= 9000) return ("C",  "Reduced",    "Deep discount - sell immediately",        false);
        return                  ("D",  "Rejected",   "Dispute triggered",                       true);
    }

    // ── HIGH_TOLERANCE grading table ────────────────────
    function _gradeHighTolerance(uint256 frs)
        private
        pure
        returns (string memory, string memory, string memory, bool)
    {
        if (frs >= 9500) return ("A+", "Premium",    "Full price",                              false);
        if (frs >= 9200) return ("A",  "Fresh",      "Full price",                              false);
        if (frs >= 8800) return ("B",  "Acceptable", "Minor discount",                          false);
        if (frs >= 8500) return ("C",  "Reduced",    "Sell soon",                               false);
        return                  ("D",  "Rejected",   "Dispute triggered",                       true);
    }

    // ───────────────────────────────────────────────────
    //  c) Freshness Anomaly Detection
    // ───────────────────────────────────────────────────

    /// @notice Scan an FRS history for suspicious *increases* that may
    ///         indicate preservative use or data tampering.
    /// @dev    Any later reading more than 50 bp above any earlier reading
    ///         is flagged as an anomaly.
    /// @param  frsHistory  Chronologically ordered FRS readings.
    /// @return isAnomaly   True if an anomaly was found.
    /// @return anomalyIndex Index of the first anomalous entry.
    function detectFreshnessAnomaly(
        uint256[] memory frsHistory
    ) internal pure returns (bool isAnomaly, uint256 anomalyIndex) {
        if (frsHistory.length < 2) {
            return (false, 0);
        }

        for (uint256 i = 1; i < frsHistory.length; i++) {
            for (uint256 j = 0; j < i; j++) {
                // A later entry is higher than an earlier one by > 50 bp
                if (frsHistory[i] > frsHistory[j] + 50) {
                    return (true, i);
                }
            }
        }

        return (false, 0);
    }

    // ───────────────────────────────────────────────────
    //  d) Predictive Dynamic Expiry Estimate (PDEE)
    // ───────────────────────────────────────────────────

    /// @notice Estimate the remaining shelf-life window in hours.
    /// @param  cat                   Produce category.
    /// @param  originFRS             FRS at origin (basis points).
    /// @param  transitHoursExpected  Expected hours in transit.
    /// @return expiryWindowHours     Predicted hours until expiry.
    function computePDEE(
        ProduceCategory cat,
        uint256 originFRS,
        uint256 transitHoursExpected
    ) internal pure returns (uint256 expiryWindowHours) {
        uint256 baseHours;
        uint256 minHours;

        if (cat == ProduceCategory.HIGH_SENSITIVITY) {
            baseHours = 24;
            minHours  = 6;
        } else if (cat == ProduceCategory.HIGH_TOLERANCE) {
            baseHours = 168;
            minHours  = 24;
        } else {
            // STANDARD
            baseHours = 72;
            minHours  = 12;
        }

        // Reduction based on how far below perfect the origin FRS is
        uint256 reduction = (10000 - originFRS) / 200;

        // Subtract reduction from base; clamp to minHours
        if (baseHours > reduction) {
            expiryWindowHours = baseHours - reduction;
        } else {
            expiryWindowHours = minHours;
        }

        // Subtract transit time
        if (expiryWindowHours > transitHoursExpected) {
            expiryWindowHours = expiryWindowHours - transitHoursExpected;
        } else {
            expiryWindowHours = 0;
        }

        // Enforce the minimum
        if (expiryWindowHours < minHours) {
            expiryWindowHours = minHours;
        }
    }

    // ───────────────────────────────────────────────────
    //  e) FRS Delta
    // ───────────────────────────────────────────────────

    /// @notice Compute the absolute difference between two FRS values.
    /// @param  frs1       First FRS reading (basis points).
    /// @param  frs2       Second FRS reading (basis points).
    /// @return delta      Absolute difference.
    /// @return isDecrease True when frs2 < frs1 (quality declined).
    function calculateFRSDelta(
        uint256 frs1,
        uint256 frs2
    ) internal pure returns (uint256 delta, bool isDecrease) {
        if (frs2 >= frs1) {
            delta      = frs2 - frs1;
            isDecrease = false;
        } else {
            delta      = frs1 - frs2;
            isDecrease = true;
        }
    }
}
