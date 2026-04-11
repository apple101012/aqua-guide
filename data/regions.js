export const regions = [
  {
    id: "coxs-bazar-bangladesh",
    name: "Cox's Bazar, Bangladesh",
    country: "Bangladesh",
    countryIso2: "BD",
    countryIso3: "BGD",
    flag: "🇧🇩",
    utility: "Coastal area with saltwater intrusion and weather-vulnerable water access",
    recordLabel: "Salinity pressure and infrastructure strain",
    coordinates: { lat: 21.4272, lng: 92.0058 },
    status: "caution",
    statusLabel: "Caution",
    qualityIndex: 66,
    metrics: { lead: "3.4", chlorine: "0.5", ph: "7.1", updated: "Apr 10, 8:15 AM" },
    tag: "Coastal resilience",
    oneLiner:
      "Storm surges and rising salinity regularly disrupt water reliability along the coast, making treatment and safe storage essential.",
    heroTitle: "Water safety in coastal Bangladesh",
    heroDescription:
      "Coastal Bangladesh faces recurring storm damage and saltwater intrusion that can compromise tap and well water without warning. This guide covers the steps you need to protect your drinking water, whether you live here or are visiting.",
    summaryTitle: "What you need to know",
    summaryText:
      "Water conditions along the coast can shift quickly after storms, flooding, or infrastructure damage. Choose treated or bottled water for drinking and cooking, keep safe water separated from water used for washing, and check back for updated conditions before returning to your normal routine.",
    quickSummary:
      "Stick to treated or bottled water for drinking and cooking. Keep your safe water covered and separated from other uses. Check for updates before going back to tap or well water.",
    highlights: [
      {
        tone: "caution",
        title: "Storm-sensitive supply",
        detail: "Heavy weather and salinity can make water safety conditions change quickly.",
        icon: "alert"
      },
      {
        tone: "info",
        title: "Plain-language guidance",
        detail: "Technical water quality data is broken down into clear actions you can follow right away.",
        icon: "shield"
      },
      {
        tone: "teal",
        title: "Storage matters",
        detail: "Clean handling after collection is just as important as the source itself.",
        icon: "box"
      }
    ],
    sources: [
      { label: "UNICEF WASH reporting", icon: "globe" },
      { label: "WHO drinking-water guidance", icon: "file" },
      { label: "Regional situation summaries", icon: "monitor" }
    ],
    actionsTitle: "Water safety essentials",
    actionsSubtitle: "Essential steps to keep your water safe in coastal conditions.",
    actions: [
      {
        id: "treat",
        title: "Treat drinking water first",
        description: "Use boiled, chlorinated, or bottled water for drinking, cooking, and brushing teeth.",
        detail:
          "Saltwater intrusion and storm runoff can contaminate sources that normally look and taste fine. Treating water before consumption is the single most effective step to prevent waterborne illness.",
        steps: [
          "Reserve treated or bottled water for drinking and cooking first.",
          "If bottled water is limited, boil or disinfect water using locally trusted guidance.",
          "Keep untreated water physically separate from your drinking water."
        ],
        tone: "red",
        icon: "alert"
      },
      {
        id: "store",
        title: "Store safe water carefully",
        description: "Use a clean covered container and keep safe water separate from washing water.",
        detail:
          "Many contamination problems happen after collection, not at the source. Using a covered container and avoiding hand contact with stored water prevents recontamination that can undo your treatment effort.",
        steps: [
          "Use a clean container with a cover whenever possible.",
          "Label drinking water if multiple containers are being used.",
          "Use a clean ladle, spout, or cup instead of dipping hands into the container."
        ],
        tone: "blue",
        icon: "box"
      },
      {
        id: "protect",
        title: "Protect vulnerable people first",
        description: "Reserve the safest water for babies, elders, and anyone already sick.",
        detail:
          "Infants, elderly individuals, and people who are already ill are far more susceptible to waterborne pathogens. Prioritizing the safest water for them can prevent serious complications.",
        steps: [
          "Set aside the safest available water for infants, elders, and sick individuals.",
          "Use treated water for medicine, formula, and oral rehydration.",
          "Do not assume clear-looking water is safe enough for vulnerable people."
        ],
        tone: "amber",
        icon: "baby"
      },
      {
        id: "share",
        title: "Share one clear summary",
        description: "Make sure everyone in your household or group is following the same water safety steps.",
        detail:
          "Miscommunication about which water is safe leads to accidental use of contaminated supplies. A single shared summary keeps everyone aligned, especially when conditions are changing.",
        steps: [
          "Share the current water safety summary with your household or travel group.",
          "Send it to the group chat or post it somewhere visible.",
          "Replace it when a newer trusted update becomes available."
        ],
        tone: "green",
        icon: "share"
      }
    ],
    aiSuggestions: [
      "Is the tap water safe to drink right now?",
      "Can I use this water for baby formula?",
      "How should I store water after boiling it?",
      "Explain this in Bengali."
    ],
    searchAliases: ["cox's bazar", "camps", "bangladesh coast", "4700", "cxb"]
  },
  {
    id: "turkana-kenya",
    name: "Turkana County, Kenya",
    country: "Kenya",
    countryIso2: "KE",
    countryIso3: "KEN",
    flag: "🇰🇪",
    utility: "Drought-affected area with limited sources and long collection distances",
    recordLabel: "Severe scarcity and untreated source risk",
    coordinates: { lat: 2.7656, lng: 35.5977 },
    status: "advisory",
    statusLabel: "Advisory",
    qualityIndex: 48,
    metrics: { lead: "5.7", chlorine: "0.2", ph: "6.9", updated: "Apr 10, 7:05 AM" },
    tag: "Scarcity response",
    oneLiner:
      "Severe water scarcity means every drop counts. Careful triage of what you treat, store, and use first can make the difference.",
    heroTitle: "Water safety in drought-affected Kenya",
    heroDescription:
      "Turkana County faces extreme water scarcity, with many communities relying on distant or untreated sources. This guide helps you prioritize: treat the cleanest supply first and direct it to the most critical needs.",
    summaryTitle: "What you need to know",
    summaryText:
      "In drought-affected areas, the challenge is not just contamination but also whether enough safe water exists for the most critical needs. Treat the cleanest available supply first, reserve it for drinking and medicine, and keep storage disciplined so treated water is not lost to avoidable recontamination.",
    quickSummary:
      "Treat the cleanest water first. Reserve it for drinking and medicine. Protect the most vulnerable people in your group.",
    highlights: [
      {
        tone: "advisory",
        title: "Severe scarcity pressure",
        detail: "Communities may depend on distant or untreated sources with little room for error.",
        icon: "alert"
      },
      {
        tone: "info",
        title: "Access and safety overlap",
        detail: "When water is limited, the order you use it in matters as much as the quality.",
        icon: "droplet"
      },
      {
        tone: "teal",
        title: "Triage matters",
        detail: "Deciding which water use comes first can prevent the most serious health risks.",
        icon: "shield"
      }
    ],
    sources: [
      { label: "UNICEF Kenya water access reporting", icon: "globe" },
      { label: "WHO household water safety guidance", icon: "file" },
      { label: "Regional response updates", icon: "monitor" }
    ],
    actionsTitle: "Water safety essentials",
    actionsSubtitle: "When water is scarce, every decision about treatment and use matters.",
    actions: [
      {
        id: "treat",
        title: "Treat the cleanest supply first",
        description: "Boil, chlorinate, or otherwise disinfect the best available source before any drinking use.",
        detail:
          "When water is scarce, you may be drawing from sources you would normally avoid. Treating the cleanest available source first gives you the highest-quality water for the uses that matter most.",
        steps: [
          "Identify the cleanest available source before mixing supplies together.",
          "Apply the locally trusted treatment method before any drinking or cooking use.",
          "Use that treated supply for direct consumption before all other needs."
        ],
        tone: "red",
        icon: "alert"
      },
      {
        id: "protect",
        title: "Protect high-risk individuals first",
        description: "Reserve the safest water for babies, elders, and anyone who is dehydrated or sick.",
        detail:
          "Dehydration and waterborne illness hit young children, elderly people, and those already weakened the hardest. In scarcity conditions, directing the safest water to them first is the highest-impact decision you can make.",
        steps: [
          "Prioritize infants, elders, and sick individuals first.",
          "Use treated water for formula, medicine, and oral rehydration.",
          "Keep one dedicated container for the highest-priority use."
        ],
        tone: "amber",
        icon: "baby"
      },
      {
        id: "store",
        title: "Prevent recontamination after collection",
        description: "Protect safe water during transport and storage so treatment effort is not wasted.",
        detail:
          "The journey from source to use is where many preventable contamination events happen. Covering containers and avoiding hand contact protects the treatment effort you already invested.",
        steps: [
          "Use covered containers whenever possible.",
          "Do not touch stored water with unclean cups or hands.",
          "Keep washing water separate from drinking water."
        ],
        tone: "blue",
        icon: "box"
      },
      {
        id: "share",
        title: "Share the water safety plan",
        description: "Use one plain-language summary so everyone is working from the same priorities.",
        detail:
          "When multiple people are collecting, storing, and using water, confusion about which supply is treated or reserved leads to waste and risk. A shared plan prevents that.",
        steps: [
          "Share the summary with everyone handling water in your household or group.",
          "Confirm everyone understands which water is reserved for direct consumption.",
          "Update the plan as soon as conditions change."
        ],
        tone: "green",
        icon: "share"
      }
    ],
    aiSuggestions: [
      "What should I do first in a water advisory?",
      "How do I protect children when water is limited?",
      "Explain this in Swahili.",
      "What if we only have one clean container?"
    ],
    searchAliases: ["turkana", "lodwar", "kenya drought", "30500"]
  },
  {
    id: "beira-mozambique",
    name: "Beira, Mozambique",
    country: "Mozambique",
    countryIso2: "MZ",
    countryIso3: "MOZ",
    flag: "🇲🇿",
    utility: "Coastal city with storm recovery corridors and flood-disrupted neighborhoods",
    recordLabel: "Infrastructure disruption after severe weather",
    coordinates: { lat: -19.8333, lng: 34.85 },
    status: "caution",
    statusLabel: "Caution",
    qualityIndex: 61,
    metrics: { lead: "4.2", chlorine: "0.4", ph: "7.0", updated: "Apr 10, 6:40 AM" },
    tag: "Flood recovery",
    oneLiner:
      "Flooding can compromise water quality even when the water looks normal. Treatment and separation are essential until infrastructure recovers.",
    heroTitle: "Water safety during flood recovery in Beira",
    heroDescription:
      "After storms and flooding, damaged pipes and contaminated groundwater can make previously safe water sources unreliable. This guide covers what to do while services are stabilizing, whether you live here or are passing through.",
    summaryTitle: "What you need to know",
    summaryText:
      "Flood-related disruption can raise contamination risk even when water looks normal. Use treated water for direct consumption, separate drinking water from cleanup water, and wait for verified updates before assuming the supply has returned to normal.",
    quickSummary:
      "Drink only treated or bottled water. Keep drinking water separate from cleanup water. Wait for a verified update before resuming normal use.",
    highlights: [
      {
        tone: "caution",
        title: "Post-storm instability",
        detail: "Damaged infrastructure can affect water safety even after weather improves.",
        icon: "alert"
      },
      {
        tone: "info",
        title: "Recovery-focused guidance",
        detail: "During recovery, standard water sources may not be reliable even if they appear to be working.",
        icon: "clock"
      },
      {
        tone: "teal",
        title: "Clear next steps",
        detail: "Treatment, separation, and updates stay front and center.",
        icon: "shield"
      }
    ],
    sources: [
      { label: "UNICEF Mozambique WASH briefings", icon: "globe" },
      { label: "WHO emergency water guidance", icon: "file" },
      { label: "Operational recovery updates", icon: "monitor" }
    ],
    actionsTitle: "Water safety essentials",
    actionsSubtitle: "Protect your drinking water while infrastructure recovers.",
    actions: [
      {
        id: "treat",
        title: "Treat water before drinking",
        description: "Use treated or bottled water for drinking, cooking, and brushing teeth until conditions improve.",
        detail:
          "Floodwater carries sewage, chemicals, and debris into water systems. Even if water pressure returns, the supply may be contaminated until infrastructure is fully repaired and flushed.",
        steps: [
          "Use treated or bottled water for all direct consumption.",
          "Do not trust appearance alone after flooding or storm damage.",
          "Wait for a verified update before resuming normal use."
        ],
        tone: "red",
        icon: "alert"
      },
      {
        id: "store",
        title: "Separate drinking and cleanup water",
        description: "Keep safe water physically separate from cleaning and sanitation use.",
        detail:
          "During flood recovery, water is needed for both drinking and cleaning up. Mixing these uses in the same containers is one of the most common ways safe water gets contaminated.",
        steps: [
          "Use different containers for drinking water and cleanup water.",
          "Label or color-code containers when possible.",
          "Store drinking water in the cleanest covered container available."
        ],
        tone: "blue",
        icon: "box"
      },
      {
        id: "protect",
        title: "Protect medicine and infant use",
        description: "Reserve the safest water for medication, oral rehydration, and infant feeding first.",
        detail:
          "Contaminated water used for medicine, formula, or wound care can cause infections that are especially dangerous during recovery when medical access may be limited.",
        steps: [
          "Use only treated water for medicine and infant feeding.",
          "Avoid using uncertain water for oral rehydration or wound cleaning.",
          "Set aside the first safe supply for the most sensitive uses."
        ],
        tone: "amber",
        icon: "baby"
      },
      {
        id: "share",
        title: "Coordinate with one message",
        description: "Make sure everyone in your household or group knows what is safe right now.",
        detail:
          "During recovery, conditions change frequently. A single shared summary prevents someone from accidentally using contaminated water because they missed an update.",
        steps: [
          "Share the current summary with your household or group.",
          "Confirm which container is the protected drinking-water source.",
          "Replace the guidance when a new verified update comes in."
        ],
        tone: "green",
        icon: "share"
      }
    ],
    aiSuggestions: [
      "Why is floodwater dangerous even if it looks clean?",
      "How do I separate drinking water from cleanup water?",
      "Explain this in Portuguese.",
      "Is it safe to use tap water for medicine right now?"
    ],
    searchAliases: ["beira", "mozambique coast", "2100", "flood recovery"]
  },
  {
    id: "port-au-prince-haiti",
    name: "Port-au-Prince, Haiti",
    country: "Haiti",
    countryIso2: "HT",
    countryIso3: "HTI",
    flag: "🇭🇹",
    utility: "Urban neighborhoods with intermittent service and heavy storage dependence",
    recordLabel: "Intermittent access and household storage pressure",
    coordinates: { lat: 18.5944, lng: -72.3074 },
    status: "caution",
    statusLabel: "Caution",
    qualityIndex: 58,
    metrics: { lead: "4.8", chlorine: "0.3", ph: "7.2", updated: "Apr 10, 9:05 AM" },
    tag: "Urban continuity",
    oneLiner:
      "Interrupted water service means you are relying on stored water more than usual. How you store and separate it determines whether it stays safe.",
    heroTitle: "Water safety with intermittent service in Port-au-Prince",
    heroDescription:
      "Water service in Port-au-Prince is frequently interrupted, forcing residents and visitors to depend on stored water for extended periods. This guide covers safe storage, container discipline, and how to prioritize your supply.",
    summaryTitle: "What you need to know",
    summaryText:
      "When service is intermittent, the biggest risks often come from how water is stored and reused. Protect the cleanest available water for drinking and cooking, use separate containers for lower-priority needs, and make sure everyone handling water is working from the same plan.",
    quickSummary:
      "Keep your cleanest water reserved for drinking and cooking. Use separate containers for different purposes. Make sure everyone in your household knows the plan.",
    highlights: [
      {
        tone: "caution",
        title: "Intermittent access pressure",
        detail: "You may need to store water longer and reuse containers more often than usual.",
        icon: "alert"
      },
      {
        tone: "info",
        title: "Storage is central",
        detail: "Container hygiene and separation are often more important than the original source quality.",
        icon: "box"
      },
      {
        tone: "teal",
        title: "Shared understanding matters",
        detail: "One clear plan reduces avoidable mistakes when multiple people are handling water.",
        icon: "share"
      }
    ],
    sources: [
      { label: "UNICEF urban WASH updates", icon: "globe" },
      { label: "WHO drinking-water guidance", icon: "file" },
      { label: "Community service continuity notes", icon: "monitor" }
    ],
    actionsTitle: "Water safety essentials",
    actionsSubtitle: "Safe storage and separation are key when water service is unreliable.",
    actions: [
      {
        id: "treat",
        title: "Reserve the safest water for direct use",
        description: "Keep the cleanest treated water only for drinking, cooking, and medicine.",
        detail:
          "When service is unreliable, it is tempting to use whatever water is available for everything. But reserving your best water for consumption prevents the most serious health risks, even if it means rationing.",
        steps: [
          "Pick the cleanest treated source for drinking and cooking only.",
          "Do not use this protected supply for washing or cleanup.",
          "Refill and protect this container before lower-priority uses."
        ],
        tone: "red",
        icon: "alert"
      },
      {
        id: "store",
        title: "Use separate containers by purpose",
        description: "Label or assign containers so drinking water stays isolated from general use.",
        detail:
          "Cross-contamination between containers is one of the fastest ways to lose a safe water supply. Dedicating containers to specific uses keeps your drinking water protected even during extended outages.",
        steps: [
          "Dedicate one container to direct consumption only.",
          "Use separate containers for washing, cleaning, or sanitation.",
          "Clean and dry drinking-water containers before refilling."
        ],
        tone: "blue",
        icon: "box"
      },
      {
        id: "protect",
        title: "Prioritize medicine and hydration",
        description: "Use the protected supply first for hydration, medicine, and anyone who is already weak or sick.",
        detail:
          "Dehydration and medication errors from contaminated water are among the most dangerous outcomes of intermittent service. Directing your safest supply to these uses first is the highest-priority decision.",
        steps: [
          "Use protected water first for medicine, rehydration, and infant care.",
          "Do not dilute medicine or formula with uncertain water.",
          "Treat the next batch before the protected supply runs out."
        ],
        tone: "amber",
        icon: "baby"
      },
      {
        id: "share",
        title: "Keep one shared plan",
        description: "Make sure everyone handling water follows the same rules.",
        detail:
          "When multiple people draw from the same containers, one person's mistake can compromise the whole supply. A visible, shared plan prevents that.",
        steps: [
          "Share the current plan with your household or group, or write it down somewhere visible.",
          "Clarify which container is the protected drinking-water source.",
          "Update the plan when the service pattern changes."
        ],
        tone: "green",
        icon: "share"
      }
    ],
    aiSuggestions: [
      "How should I label my water containers?",
      "Which water should I save for medicine?",
      "Explain this in French.",
      "What should I do when service comes back for only a few hours?"
    ],
    searchAliases: ["haiti", "port au prince", "pap", "urban storage"]
  }
];

export const spotlightSearches = [
  "Nairobi, Kenya",
  "Dhaka, Bangladesh",
  "Maputo, Mozambique",
  "Port-au-Prince, Haiti",
  "Lagos, Nigeria",
  "Khulna, Bangladesh",
  "Mombasa, Kenya",
  "Beira, Mozambique"
];

export const featuredSearches = [
  { label: "Nairobi, Kenya", query: "Nairobi, Kenya" },
  { label: "Dhaka, Bangladesh", query: "Dhaka, Bangladesh" },
  { label: "Lagos, Nigeria", query: "Lagos, Nigeria" },
  { label: "Karachi, Pakistan", query: "Karachi, Pakistan" },
  { label: "Addis Ababa, Ethiopia", query: "Addis Ababa, Ethiopia" },
  { label: "Kampala, Uganda", query: "Kampala, Uganda" },
  { label: "Manila, Philippines", query: "Manila, Philippines" },
  { label: "Lima, Peru", query: "Lima, Peru" },
  { label: "Dakar, Senegal", query: "Dakar, Senegal" },
  { label: "Port-au-Prince, Haiti", query: "Port-au-Prince, Haiti" }
];

const statusRank = {
  advisory: 3,
  caution: 2,
  safe: 1
};

export function getRegionById(id) {
  return regions.find((region) => region.id === id) ?? null;
}

export function findRegionByQuery(query) {
  const normalized = String(query ?? "").trim().toLowerCase();
  if (!normalized) return null;

  return (
    regions.find((region) => region.id === normalized) ||
    regions.find(
      (region) =>
        region.name.toLowerCase() === normalized ||
        region.country.toLowerCase() === normalized ||
        region.searchAliases.some((alias) => alias.toLowerCase() === normalized)
    ) ||
    regions.find(
      (region) =>
        region.name.toLowerCase().includes(normalized) ||
        region.country.toLowerCase().includes(normalized) ||
        region.searchAliases.some((alias) => alias.toLowerCase().includes(normalized))
    ) ||
    null
  );
}

export function sortRegionsByPriority(items = regions) {
  return [...items].sort((left, right) => {
    const rankGap = (statusRank[right.status] ?? 0) - (statusRank[left.status] ?? 0);
    if (rankGap !== 0) return rankGap;
    return right.qualityIndex - left.qualityIndex;
  });
}

export function getMostCriticalRegion() {
  return sortRegionsByPriority(regions)[0];
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

export function getDistanceKm(from, to) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.lat)) *
      Math.cos(toRadians(to.lat)) *
      Math.sin(dLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getNearestRegion(coords) {
  return regions
    .map((region) => ({
      region,
      distanceKm: getDistanceKm(coords, region.coordinates)
    }))
    .sort((left, right) => left.distanceKm - right.distanceKm)[0];
}
