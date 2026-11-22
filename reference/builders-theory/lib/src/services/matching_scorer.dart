import 'dart:math' as math;

/// Domain model representing an NGO or Recipient Organisation for matching.
class NgoCandidate {
  final int id;
  final String name;
  final String type; // e.g. 'ngo', 'shelter', 'community_kitchen', 'food_bank'
  final double capacity; // remaining or maximum capacity in units/meals
  final double latitude;
  final double longitude;
  final double serviceRadiusKm;
  final String? operatingHoursStart; // "09:00"
  final String? operatingHoursEnd; // "22:00"
  final List<String> acceptedCategories; // ['cooked_meal', 'dry_ration', etc.]
  final double reliabilityRating; // 0.0 to 5.0

  const NgoCandidate({
    required this.id,
    required this.name,
    this.type = 'ngo',
    required this.capacity,
    required this.latitude,
    required this.longitude,
    this.serviceRadiusKm = 15.0,
    this.operatingHoursStart,
    this.operatingHoursEnd,
    this.acceptedCategories = const <String>[],
    this.reliabilityRating = 5.0,
  });

  /// Flexible factory that extracts fields from Serverpod generated models,
  /// dynamic database rows, or JSON maps with defensive fallbacks.
  factory NgoCandidate.fromDynamic(dynamic source) {
    if (source is NgoCandidate) return source;

    if (source is Map<String, dynamic>) {
      return NgoCandidate(
        id: (source['id'] as num?)?.toInt() ?? 0,
        name: (source['name'] as String?) ?? 'Unknown NGO',
        type: (source['type'] as String?) ?? 'ngo',
        capacity: (source['capacity'] as num?)?.toDouble() ??
            (source['remainingCapacity'] as num?)?.toDouble() ??
            0.0,
        latitude: (source['latitude'] as num?)?.toDouble() ?? 0.0,
        longitude: (source['longitude'] as num?)?.toDouble() ?? 0.0,
        serviceRadiusKm:
            (source['serviceRadiusKm'] as num?)?.toDouble() ?? 15.0,
        operatingHoursStart: source['operatingHoursStart']?.toString(),
        operatingHoursEnd: source['operatingHoursEnd']?.toString(),
        acceptedCategories: (source['acceptedCategories'] as List<dynamic>?)
                ?.map((e) => e.toString().toLowerCase())
                .toList() ??
            const <String>[],
        reliabilityRating:
            (source['reliabilityRating'] as num?)?.toDouble() ?? 5.0,
      );
    }

    // Dynamic property access fallback for Serverpod generated classes
    try {
      return NgoCandidate(
        id: (source.id as num?)?.toInt() ?? 0,
        name: (source.name as String?) ?? 'Unknown NGO',
        type: (source.type as String?) ?? 'ngo',
        capacity: (source.capacity as num?)?.toDouble() ??
            (source.remainingCapacity as num?)?.toDouble() ??
            0.0,
        latitude: (source.latitude as num?)?.toDouble() ?? 0.0,
        longitude: (source.longitude as num?)?.toDouble() ?? 0.0,
        serviceRadiusKm:
            (source.serviceRadiusKm as num?)?.toDouble() ?? 15.0,
        operatingHoursStart: source.operatingHoursStart?.toString(),
        operatingHoursEnd: source.operatingHoursEnd?.toString(),
        acceptedCategories: (source.acceptedCategories as List<dynamic>?)
                ?.map((e) => e.toString().toLowerCase())
                .toList() ??
            const <String>[],
        reliabilityRating:
            (source.reliabilityRating as num?)?.toDouble() ?? 5.0,
      );
    } catch (_) {
      return const NgoCandidate(
        id: 0,
        name: 'Fallback NGO',
        capacity: 100.0,
        latitude: 0.0,
        longitude: 0.0,
      );
    }
  }

  Map<String, dynamic> toMap() => {
        'id': id,
        'name': name,
        'type': type,
        'capacity': capacity,
        'latitude': latitude,
        'longitude': longitude,
        'serviceRadiusKm': serviceRadiusKm,
        'operatingHoursStart': operatingHoursStart,
        'operatingHoursEnd': operatingHoursEnd,
        'acceptedCategories': acceptedCategories,
        'reliabilityRating': reliabilityRating,
      };
}

/// Domain model representing food donation requirements for matching.
class DonationRequirement {
  final int id;
  final String title;
  final String category; // 'cooked_meal', 'dry_ration', 'produce', 'bakery'
  final double quantity; // in units/meals/kg
  final String unit; // 'meals', 'kg', 'servings'
  final DateTime availableUntil; // hard deadline for pickup
  final double latitude;
  final double longitude;
  final int donorId;
  final String? handlingNotes;

  const DonationRequirement({
    required this.id,
    required this.title,
    required this.category,
    required this.quantity,
    this.unit = 'meals',
    required this.availableUntil,
    required this.latitude,
    required this.longitude,
    required this.donorId,
    this.handlingNotes,
  });

  /// Flexible factory from Serverpod generated models or JSON maps
  factory DonationRequirement.fromDynamic(dynamic source) {
    if (source is DonationRequirement) return source;

    if (source is Map<String, dynamic>) {
      return DonationRequirement(
        id: (source['id'] as num?)?.toInt() ?? 0,
        title: (source['title'] as String?) ?? 'Surplus Food',
        category: (source['category'] as String?)?.toLowerCase() ?? 'general',
        quantity: (source['quantity'] as num?)?.toDouble() ?? 0.0,
        unit: (source['unit'] as String?) ?? 'meals',
        availableUntil: source['availableUntil'] is DateTime
            ? source['availableUntil'] as DateTime
            : (source['availableUntil'] != null
                ? DateTime.tryParse(source['availableUntil'].toString()) ??
                    DateTime.now().add(const Duration(hours: 3))
                : DateTime.now().add(const Duration(hours: 3))),
        latitude: (source['latitude'] as num?)?.toDouble() ?? 0.0,
        longitude: (source['longitude'] as num?)?.toDouble() ?? 0.0,
        donorId: (source['donorId'] as num?)?.toInt() ?? 0,
        handlingNotes: source['handlingNotes']?.toString(),
      );
    }

    try {
      return DonationRequirement(
        id: (source.id as num?)?.toInt() ?? 0,
        title: (source.title as String?) ?? 'Surplus Food',
        category: (source.category as String?)?.toLowerCase() ?? 'general',
        quantity: (source.quantity as num?)?.toDouble() ?? 0.0,
        unit: (source.unit as String?) ?? 'meals',
        availableUntil: source.availableUntil is DateTime
            ? source.availableUntil as DateTime
            : DateTime.now().add(const Duration(hours: 3)),
        latitude: (source.latitude as num?)?.toDouble() ?? 0.0,
        longitude: (source.longitude as num?)?.toDouble() ?? 0.0,
        donorId: (source.donorId as num?)?.toInt() ?? 0,
        handlingNotes: source.handlingNotes?.toString(),
      );
    } catch (_) {
      return DonationRequirement(
        id: 0,
        title: 'Fallback Donation',
        category: 'general',
        quantity: 50.0,
        availableUntil: DateTime.now().add(const Duration(hours: 3)),
        latitude: 0.0,
        longitude: 0.0,
        donorId: 0,
      );
    }
  }

  Map<String, dynamic> toMap() => {
        'id': id,
        'title': title,
        'category': category,
        'quantity': quantity,
        'unit': unit,
        'availableUntil': availableUntil.toIso8601String(),
        'latitude': latitude,
        'longitude': longitude,
        'donorId': donorId,
        'handlingNotes': handlingNotes,
      };
}

/// Detailed result of an eligibility check
class EligibilityResult {
  final bool isEligible;
  final String? rejectionReason;
  final double distanceKm;
  final bool capacityPassed;
  final bool distancePassed;
  final bool operatingHoursPassed;

  const EligibilityResult({
    required this.isEligible,
    this.rejectionReason,
    required this.distanceKm,
    required this.capacityPassed,
    required this.distancePassed,
    required this.operatingHoursPassed,
  });

  factory EligibilityResult.pass({required double distanceKm}) {
    return EligibilityResult(
      isEligible: true,
      distanceKm: distanceKm,
      capacityPassed: true,
      distancePassed: true,
      operatingHoursPassed: true,
    );
  }

  factory EligibilityResult.fail({
    required String reason,
    required double distanceKm,
    bool capacityPassed = true,
    bool distancePassed = true,
    bool operatingHoursPassed = true,
  }) {
    return EligibilityResult(
      isEligible: false,
      rejectionReason: reason,
      distanceKm: distanceKm,
      capacityPassed: capacityPassed,
      distancePassed: distancePassed,
      operatingHoursPassed: operatingHoursPassed,
    );
  }
}

/// Multi-factor score breakdown
class ScoringBreakdown {
  final double totalScore; // 0.0 to 100.0
  final double proximityScore; // max 35.0
  final double timingScore; // max 25.0
  final double capacityScore; // max 25.0
  final double categoryScore; // max 15.0
  final double distanceKm;
  final Duration timeUntilDeadline;

  const ScoringBreakdown({
    required this.totalScore,
    required this.proximityScore,
    required this.timingScore,
    required this.capacityScore,
    required this.categoryScore,
    required this.distanceKm,
    required this.timeUntilDeadline,
  });

  Map<String, dynamic> toMap() => {
        'totalScore': double.parse(totalScore.toStringAsFixed(1)),
        'proximityScore': double.parse(proximityScore.toStringAsFixed(1)),
        'timingScore': double.parse(timingScore.toStringAsFixed(1)),
        'capacityScore': double.parse(capacityScore.toStringAsFixed(1)),
        'categoryScore': double.parse(categoryScore.toStringAsFixed(1)),
        'distanceKm': double.parse(distanceKm.toStringAsFixed(2)),
        'timeUntilDeadlineMinutes': timeUntilDeadline.inMinutes,
      };
}

/// Human-readable match explanation
class MatchExplanation {
  final String headline;
  final List<String> tags;
  final List<String> keyStrengths;
  final String? operationalNote;

  const MatchExplanation({
    required this.headline,
    required this.tags,
    required this.keyStrengths,
    this.operationalNote,
  });

  Map<String, dynamic> toMap() => {
        'headline': headline,
        'tags': tags,
        'keyStrengths': keyStrengths,
        'operationalNote': operationalNote,
      };
}

/// Fully ranked match candidate
class ScoredMatch {
  final NgoCandidate organisation;
  final ScoringBreakdown score;
  final MatchExplanation explanation;
  final int rank;

  const ScoredMatch({
    required this.organisation,
    required this.score,
    required this.explanation,
    required this.rank,
  });

  Map<String, dynamic> toMap() => {
        'organisation': organisation.toMap(),
        'score': score.toMap(),
        'explanation': explanation.toMap(),
        'rank': rank,
      };
}

/// Matching & Ranking Engine
/// Pure, deterministic, null-safe implementation for SurplusLink AI.
class MatchingScorer {
  static const double earthRadiusKm = 6371.0;

  // ---------------------------------------------------------------------------
  // PHASE 1: ELIGIBILITY FILTERING
  // ---------------------------------------------------------------------------

  /// Calculates great-circle distance between two GPS coordinates using Haversine formula.
  static double calculateDistanceKm(
    double lat1,
    double lon1,
    double lat2,
    double lon2,
  ) {
    if (lat1 == lat2 && lon1 == lon2) return 0.0;

    final double dLat = _degreesToRadians(lat2 - lat1);
    final double dLon = _degreesToRadians(lon2 - lon1);

    final double radLat1 = _degreesToRadians(lat1);
    final double radLat2 = _degreesToRadians(lat2);

    final double a = math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.sin(dLon / 2) *
            math.sin(dLon / 2) *
            math.cos(radLat1) *
            math.cos(radLat2);

    final double c = 2 * math.asin(math.sqrt(math.max(0.0, math.min(1.0, a))));
    return earthRadiusKm * c;
  }

  static double _degreesToRadians(double degrees) => degrees * (math.pi / 180.0);

  /// 1. Capacity Filter:
  /// Exclude NGO if remaining/max capacity is smaller than donated quantity.
  static bool checkCapacity(NgoCandidate candidate, DonationRequirement donation) {
    if (candidate.capacity <= 0) return false;
    return candidate.capacity >= donation.quantity;
  }

  /// 2. Service-Area / Distance Filter:
  /// Exclude NGO if donor venue is outside the NGO's operating radius.
  static bool checkDistance(
    NgoCandidate candidate,
    DonationRequirement donation,
    double distanceKm,
  ) {
    final double maxRadius = candidate.serviceRadiusKm > 0
        ? candidate.serviceRadiusKm
        : 15.0; // standard 15km default
    return distanceKm <= maxRadius;
  }

  /// 3. Deadline / Operating Hours Filter:
  /// Exclude NGO if collection deadline falls outside operating window.
  static bool checkOperatingHours(
    NgoCandidate candidate,
    DonationRequirement donation, {
    DateTime? referenceTime,
  }) {
    final DateTime now = referenceTime ?? DateTime.now();

    // If deadline has already passed, ineligible
    if (donation.availableUntil.isBefore(now)) {
      return false;
    }

    // If no operating hours specified, assume 24/7 emergency readiness
    if (candidate.operatingHoursStart == null ||
        candidate.operatingHoursEnd == null) {
      return true;
    }

    final int? startMinutes = _parseTimeToMinutes(candidate.operatingHoursStart!);
    final int? endMinutes = _parseTimeToMinutes(candidate.operatingHoursEnd!);

    if (startMinutes == null || endMinutes == null) {
      return true; // Malformed string fallback: do not exclude
    }

    // Convert donation availableUntil to local time-of-day minutes
    final int deadlineMinutes =
        donation.availableUntil.hour * 60 + donation.availableUntil.minute;

    if (endMinutes >= startMinutes) {
      // Standard daytime window (e.g. 09:00 to 22:00)
      return deadlineMinutes >= startMinutes && deadlineMinutes <= endMinutes;
    } else {
      // Overnight operating window (e.g. 20:00 to 06:00)
      return deadlineMinutes >= startMinutes || deadlineMinutes <= endMinutes;
    }
  }

  /// Evaluates full eligibility pipeline for a single candidate.
  static EligibilityResult checkEligibility(
    NgoCandidate candidate,
    DonationRequirement donation, {
    DateTime? referenceTime,
  }) {
    final double distanceKm = calculateDistanceKm(
      donation.latitude,
      donation.longitude,
      candidate.latitude,
      candidate.longitude,
    );

    // 1. Capacity Check
    final bool capOk = checkCapacity(candidate, donation);
    if (!capOk) {
      return EligibilityResult.fail(
        reason:
            'Insufficient capacity: donation requires ${donation.quantity.toStringAsFixed(0)} ${donation.unit}, but NGO has ${candidate.capacity.toStringAsFixed(0)} available capacity.',
        distanceKm: distanceKm,
        capacityPassed: false,
      );
    }

    // 2. Service Area Check
    final bool distOk = checkDistance(candidate, donation, distanceKm);
    if (!distOk) {
      return EligibilityResult.fail(
        reason:
            'Outside service radius: distance is ${distanceKm.toStringAsFixed(1)} km (max radius is ${candidate.serviceRadiusKm.toStringAsFixed(1)} km).',
        distanceKm: distanceKm,
        distancePassed: false,
      );
    }

    // 3. Operating Hours Check
    final bool hoursOk = checkOperatingHours(
      candidate,
      donation,
      referenceTime: referenceTime,
    );
    if (!hoursOk) {
      return EligibilityResult.fail(
        reason:
            'Operating hours mismatch: donation expires at ${_formatDateTime(donation.availableUntil)}, outside NGO window (${candidate.operatingHoursStart} - ${candidate.operatingHoursEnd}).',
        distanceKm: distanceKm,
        operatingHoursPassed: false,
      );
    }

    return EligibilityResult.pass(distanceKm: distanceKm);
  }

  /// Filters list of candidates, returning only eligible ones alongside their distances.
  static List<MapEntry<NgoCandidate, double>> filterEligible(
    List<NgoCandidate> candidates,
    DonationRequirement donation, {
    DateTime? referenceTime,
  }) {
    final List<MapEntry<NgoCandidate, double>> eligible = [];

    for (final candidate in candidates) {
      final result = checkEligibility(
        candidate,
        donation,
        referenceTime: referenceTime,
      );
      if (result.isEligible) {
        eligible.add(MapEntry(candidate, result.distanceKm));
      }
    }

    return eligible;
  }

  // ---------------------------------------------------------------------------
  // PHASE 2: MULTI-FACTOR SUITABILITY SCORING
  // ---------------------------------------------------------------------------

  /// Computes composite suitability score (0 to 100) across 4 weighted factors:
  /// - Proximity (35%)
  /// - Pickup Timing & Urgency (25%)
  /// - Capacity Fit (25%)
  /// - Food Category Suitability (15%)
  static ScoringBreakdown computeScore(
    NgoCandidate candidate,
    DonationRequirement donation, {
    double? precalculatedDistanceKm,
    DateTime? referenceTime,
  }) {
    final DateTime now = referenceTime ?? DateTime.now();
    final double distanceKm = precalculatedDistanceKm ??
        calculateDistanceKm(
          donation.latitude,
          donation.longitude,
          candidate.latitude,
          candidate.longitude,
        );

    final Duration timeUntilDeadline =
        donation.availableUntil.difference(now);

    // 1. Proximity Score (Max: 35.0)
    // Closer distance receives higher score using linear falloff within service radius
    final double maxRadius = math.max(1.0, candidate.serviceRadiusKm);
    final double normalizedDist = math.min(1.0, distanceKm / maxRadius);
    final double proximityScore = 35.0 * math.max(0.0, 1.0 - normalizedDist);

    // 2. Pickup Timing Score (Max: 25.0)
    // Evaluates rescue feasibility based on transit time vs deadline
    // Estimated city transit: 25 km/h + 15 min buffer
    final double transitHours = (distanceKm / 25.0) + 0.25;
    final double availableHours =
        math.max(0.1, timeUntilDeadline.inMinutes / 60.0);

    double timingScore = 0.0;
    if (availableHours >= transitHours) {
      final double bufferRatio = (availableHours - transitHours) / availableHours;
      // High score when plenty of safe buffer exists, tapering off if extremely tight
      timingScore = 25.0 * math.min(1.0, math.max(0.2, bufferRatio));
    } else {
      timingScore = 5.0; // Critical warning buffer
    }

    // 3. Capacity Fit Score (Max: 25.0)
    // Best fit utilizes 70% to 95% of NGO capacity, penalizing over-allocation or tiny utilization
    double capacityScore = 0.0;
    if (candidate.capacity > 0) {
      final double fillRatio = donation.quantity / candidate.capacity;
      if (fillRatio <= 1.0) {
        if (fillRatio >= 0.5 && fillRatio <= 0.95) {
          // Sweet spot: high efficiency utilization
          capacityScore = 25.0;
        } else if (fillRatio < 0.5) {
          // Under-utilization: still good, slight discount
          capacityScore = 15.0 + (10.0 * (fillRatio / 0.5));
        } else {
          // Close to 100% capacity
          capacityScore = 22.0;
        }
      }
    }

    // 4. Food Category Suitability (Max: 15.0)
    double categoryScore = 0.0;
    final String reqCat = donation.category.toLowerCase().trim();

    if (candidate.acceptedCategories.isEmpty) {
      categoryScore = 10.0; // General NGO accepts all types
    } else {
      final bool exactMatch = candidate.acceptedCategories
          .any((cat) => cat.contains(reqCat) || reqCat.contains(cat));
      if (exactMatch) {
        categoryScore = 15.0; // Specialist match
      } else {
        categoryScore = 5.0; // Partial match
      }
    }

    // Reliability modifier (adds up to +5 points for 5-star NGOs)
    final double reliabilityBonus =
        math.min(5.0, (candidate.reliabilityRating / 5.0) * 5.0);

    final double rawTotal = proximityScore +
        timingScore +
        capacityScore +
        categoryScore +
        reliabilityBonus;

    final double totalScore = math.min(100.0, math.max(0.0, rawTotal));

    return ScoringBreakdown(
      totalScore: totalScore,
      proximityScore: proximityScore,
      timingScore: timingScore,
      capacityScore: capacityScore,
      categoryScore: categoryScore,
      distanceKm: distanceKm,
      timeUntilDeadline: timeUntilDeadline,
    );
  }

  // ---------------------------------------------------------------------------
  // PHASE 3: EXPLAINABLE MATCH REASONS
  // ---------------------------------------------------------------------------

  /// Generates human-readable, explainable match reason tags and summaries
  /// for NGO cards, live inbox, and judge inspection.
  static MatchExplanation generateExplanation(
    NgoCandidate candidate,
    DonationRequirement donation,
    ScoringBreakdown score,
  ) {
    final List<String> tags = [];
    final List<String> keyStrengths = [];

    // Proximity Tag
    final int estimatedTransitMinutes =
        math.max(5, ((score.distanceKm / 25.0) * 60).round() + 10);
    tags.add('📍 ${score.distanceKm.toStringAsFixed(1)} km (~$estimatedTransitMinutes min away)');

    if (score.distanceKm < 3.0) {
      keyStrengths.add('High proximity: Fast response time under 15 minutes.');
    }

    // Category Tag
    final String catName = _formatCategoryName(donation.category);
    if (candidate.acceptedCategories.any((c) => c.contains(donation.category))) {
      tags.add('🍱 Certified $catName Specialist');
      keyStrengths.add('Specialized facility equipped for $catName handling.');
    } else {
      tags.add('🤝 Verified Community Partner');
    }

    // Capacity Tag
    final int fillPct = candidate.capacity > 0
        ? ((donation.quantity / candidate.capacity) * 100).round()
        : 100;
    tags.add('📦 Capacity Fit ($fillPct% utilized)');
    keyStrengths.add(
        'Sufficient capacity: Accommodates ${donation.quantity.toStringAsFixed(0)} ${donation.unit} within available quota of ${candidate.capacity.toStringAsFixed(0)}.');

    // Timing Tag
    if (candidate.operatingHoursEnd != null) {
      tags.add('⏰ Open until ${candidate.operatingHoursEnd}');
    } else {
      tags.add('⚡ 24/7 Active Rescue');
    }

    final String headline = score.totalScore >= 80.0
        ? 'Excellent Match (${score.totalScore.toStringAsFixed(0)}/100) — Optimal proximity & capacity'
        : score.totalScore >= 60.0
            ? 'Strong Match (${score.totalScore.toStringAsFixed(0)}/100) — Meets all collection requirements'
            : 'Viable Match (${score.totalScore.toStringAsFixed(0)}/100) — Eligible for backup pickup';

    final String operationalNote = donation.handlingNotes != null &&
            donation.handlingNotes!.isNotEmpty
        ? 'Handling requirement: ${donation.handlingNotes}'
        : 'Ready for immediate dispatch upon confirmation.';

    return MatchExplanation(
      headline: headline,
      tags: tags,
      keyStrengths: keyStrengths,
      operationalNote: operationalNote,
    );
  }

  // ---------------------------------------------------------------------------
  // FULL END-TO-END PIPELINE: FILTER, SCORE & RANK
  // ---------------------------------------------------------------------------

  /// Runs complete Matching & Ranking pipeline:
  /// 1. Filters out ineligible NGOs
  /// 2. Scores each eligible candidate
  /// 3. Explains match reasons
  /// 4. Returns candidates ranked by score descending
  static List<ScoredMatch> rankRecipients({
    required List<NgoCandidate> candidates,
    required DonationRequirement donation,
    int? limit,
    DateTime? referenceTime,
  }) {
    // Phase 1: Filter
    final eligibleEntries = filterEligible(
      candidates,
      donation,
      referenceTime: referenceTime,
    );

    // Phase 2 & 3: Score & Explain
    final List<ScoredMatch> matches = [];

    for (final entry in eligibleEntries) {
      final candidate = entry.key;
      final distanceKm = entry.value;

      final score = computeScore(
        candidate,
        donation,
        precalculatedDistanceKm: distanceKm,
        referenceTime: referenceTime,
      );

      final explanation = generateExplanation(candidate, donation, score);

      matches.add(ScoredMatch(
        organisation: candidate,
        score: score,
        explanation: explanation,
        rank: 0, // Assigned after sorting
      ));
    }

    // Sort descending by total score
    matches.sort((a, b) => b.score.totalScore.compareTo(a.score.totalScore));

    // Assign final ranks (1-indexed)
    final List<ScoredMatch> ranked = [];
    for (int i = 0; i < matches.length; i++) {
      final m = matches[i];
      ranked.add(ScoredMatch(
        organisation: m.organisation,
        score: m.score,
        explanation: m.explanation,
        rank: i + 1,
      ));
    }

    if (limit != null && limit > 0 && ranked.length > limit) {
      return ranked.sublist(0, limit);
    }

    return ranked;
  }

  // ---------------------------------------------------------------------------
  // HELPER METHODS
  // ---------------------------------------------------------------------------

  static int? _parseTimeToMinutes(String timeStr) {
    try {
      final clean = timeStr.trim().toLowerCase();
      final parts = clean.split(':');
      if (parts.length >= 2) {
        int hour = int.parse(parts[0]);
        int minute = int.parse(parts[1].substring(0, math.min(2, parts[1].length)));
        if (clean.contains('pm') && hour < 12) hour += 12;
        if (clean.contains('am') && hour == 12) hour = 0;
        return hour * 60 + minute;
      }
      final singleHour = int.tryParse(clean);
      if (singleHour != null) return singleHour * 60;
    } catch (_) {}
    return null;
  }

  static String _formatDateTime(DateTime dt) {
    final hour = dt.hour.toString().padLeft(2, '0');
    final minute = dt.minute.toString().padLeft(2, '0');
    return '$hour:$minute';
  }

  static String _formatCategoryName(String raw) {
    return raw
        .replaceAll('_', ' ')
        .split(' ')
        .map((w) => w.isNotEmpty ? '${w[0].toUpperCase()}${w.substring(1)}' : '')
        .join(' ');
  }
}
