/**
 * Built-in answers used when the knowledge base has no match or is unreachable.
 *
 * Each topic has an English and a Swahili answer, and every answer is a full
 * paragraph of advice, never an empty string. The topics mirror the seeded
 * knowledge base, so the answers are consistent with the articles.
 */

export type Lang = "en" | "sw";

export interface FallbackTopic {
  id: string;
  /** Lowercase keywords (English and Swahili) that select this topic. */
  keywords: readonly string[];
  answer: Record<Lang, string>;
}

export const FALLBACK_TOPICS: readonly FallbackTopic[] = [
  {
    id: "mln",
    keywords: [
      "mln",
      "necrosis",
      "lethal",
      "yellow streak",
      "dead heart",
      "mosaic",
      "mahindi yanakufa",
    ],
    answer: {
      en:
        "Maize Lethal Necrosis (MLN) is caused by a combined infection of two viruses, spread mainly by thrips and aphids. Look for yellow streaks on young leaves, dead hearts and stunted plants. There is no cure once infected, so act early: plant certified MLN-tolerant seed, scout weekly, pull out and destroy infected plants including roots, and keep the field free of volunteer maize and weeds. Report outbreaks to your county extension officer.",
      sw:
        "Ugonjwa wa MLN (Maize Lethal Necrosis) husababishwa na virusi viwili kwa pamoja, na huenezwa zaidi na thrips na aphids. Angalia mistari ya njano kwenye majani machanga, moyo mkavu na mimea iliyodumaa. Hakuna tiba mara mmea unapoambukizwa, kwa hiyo chukua hatua mapema: panda mbegu zilizothibitishwa zinazostahimili MLN, kagua shamba kila wiki, ng'oa na uteketeze mimea iliyoambukizwa pamoja na mizizi, na weka shamba bila mahindi yaliyojiotea na magugu. Ripoti dalili kwa afisa wa ugani wa kaunti.",
    },
  },
  {
    id: "fertilizer",
    keywords: [
      "fertilizer",
      "fertiliser",
      "dap",
      "can",
      "npk",
      "mbolea",
      "top dress",
      "top-dress",
      "nutrient",
    ],
    answer: {
      en:
        "For maize, apply DAP (18-46-0) at planting at about 50 kg per acre, placed in the furrow and never touching the seed. At the knee-high stage, about 4 to 6 weeks after planting, top-dress with CAN (21-0-0) at about 50 kg per acre in a band 10 cm from the plant. Apply when the soil is moist, and do not exceed the recommended rate. A soil test gives the most accurate rates, so confirm locally with your extension officer.",
      sw:
        "Kwa mahindi, weka DAP (18-46-0) wakati wa kupanda, kiasi cha kg 50 kwa ekari, kwenye mfereji bila kugusa mbegu. Wakati mahindi yamefika magoti, takriban wiki 4 hadi 6 baada ya kupanda, weka CAN (21-0-0) kiasi cha kg 50 kwa ekari, umbali wa cm 10 kutoka kwenye mmea. Weka mbolea udongo ukiwa na unyevu, na usizidishe kiwango kilichopendekezwa. Kipimo cha udongo hutoa kiasi sahihi zaidi, kwa hiyo thibitisha na afisa wa ugani.",
    },
  },
  {
    id: "drought",
    keywords: [
      "drought",
      "dry",
      "dryland",
      "water shortage",
      "katumani",
      "sorghum",
      "millet",
      "ukame",
      "kame",
      "mvua imechelewa",
    ],
    answer: {
      en:
        "For dry areas, plant drought-tolerant crops such as Katumani maize, sorghum, finger millet, pigeon peas, green grams or cassava. Plant at the first reliable rains, when the soil is moist to about 15 cm. Build zai pits or contour bunds to capture rainwater, mulch with crop residue to slow evaporation, and intercrop cereals with legumes to spread the risk.",
      sw:
        "Kwa maeneo kame, panda mazao yanayostahimili ukame kama mahindi ya Katumani, mtama, wimbi, mbaazi, choroko au mihogo. Panda mvua za kwanza za kuaminika zinapoanza, wakati udongo una unyevu hadi cm 15. Tengeneza mashimo ya zai au matuta kukamata maji ya mvua, funika udongo na mabaki ya mazao ili kupunguza kukauka, na panda nafaka pamoja na mikunde.",
    },
  },
  {
    id: "zai",
    keywords: ["zai", "water harvesting", "pit", "contour", "slope"],
    answer: {
      en:
        "Zai pits are planting holes about 30 cm wide and 30 cm deep, dug about 60 to 90 cm apart along contour rows about 1 metre apart. Put a handful of manure or compost in each pit, mix it with the soil, and plant when the rains start. The pits catch rainwater and hold manure where the roots need it. Rebuild them each season and keep weeds out.",
      sw:
        "Mashimo ya zai ni mashimo ya kupanda yenye upana wa cm 30 na kina cha cm 30, yanachimbwa umbali wa cm 60 hadi 90 kwenye safu za kontua zenye umbali wa mita 1. Weka kiganja cha samadi au mboji kwenye kila shimo, changanya na udongo, kisha panda mvua zinapoanza. Mashimo hukamata maji ya mvua na kuhifadhi samadi karibu na mizizi.",
    },
  },
  {
    id: "fall_armyworm",
    keywords: [
      "armyworm",
      "army worm",
      "fall armyworm",
      "caterpillar",
      "viwavi",
      "spodoptera",
      "whorl",
    ],
    answer: {
      en:
        "Fall armyworm chews maize leaves and feeds in the whorl. Early signs are droppings near the whorl and window-pane leaf damage. Scout about 20 plants in several spots per acre, encourage natural enemies such as wasps and birds, and plant early to avoid the peak. Where control is needed, use a registered biopesticide or a product registered in Kenya for fall armyworm, applied in the evening and within its label and withholding period.",
      sw:
        "Viwavi jeshi (fall armyworm) hula majani ya mahindi na hujificha kwenye kiini cha majani. Dalili za mwanzo ni kinyesi karibu na kiini na majani yenye matundu kama dirisha. Kagua mimea takriban 20 kwa ekari, hifadhi maadui wa asili kama nyigu na ndege, na panda mapema. Ukihitaji kudhibiti, tumia dawa ya kibaiolojia au dawa iliyosajiliwa Kenya kwa viwavi jeshi, nyunyizia jioni na ufuate maelekezo ya kifungashio.",
    },
  },
  {
    id: "beans",
    keywords: ["bean", "beans", "maharage", "rosecoco", "legume", "nitrogen fix"],
    answer: {
      en:
        "Plant beans at the start of the rains, in rows about 45 cm apart with 10 cm between plants, using certified seed of an adapted variety. Beans need little nitrogen fertilizer; DAP at planting helps roots and flowering. Keep water steady at flowering and pod filling, weed in the first 3 to 4 weeks, and rotate away from beans to reduce disease. Harvest when most pods are dry and rattle.",
      sw:
        "Panda maharage mvua zinapoanza, kwenye safu za cm 45 kando, mmea mmoja kwa cm 10, ukitumia mbegu zilizothibitishwa. Maharage hayahitaji mbolea nyingi ya nitrojeni; DAP wakati wa kupanda husaidia mizizi na maua. Mwagilia kwa usawa wakati wa kutoa maua na kujaza maganda, palilia wiki 3 hadi 4 za kwanza, na badilisha mazao ili kupunguza magonjwa. Vuna maganda yanapokauka na kulia yanapotikiswa.",
    },
  },
  {
    id: "tomato",
    keywords: ["tomato", "tomatoes", "nyanya", "blight", "ukungu", "post harvest", "storage"],
    answer: {
      en:
        "For tomatoes, use resistant or certified varieties where possible and water at the base of plants to reduce late blight. Remove and destroy affected leaves and fruit, and apply a copper-based fungicide during wet spells as the label directs. Harvest when fruits are firm and just colouring, keep them shaded and ventilated, and do not refrigerate unripe fruit. Wash only just before sale.",
      sw:
        "Kwa nyanya, tumia mbegu zinazostahimili au zilizothibitishwa, na mwagilia chini ya mmea ili kupunguza ukungu wa mwisho. Ondoa na uteketeze majani na matunda yaliyoathirika, na nyunyizia dawa ya shaba wakati wa mvua kwa mujibu wa maelekezo. Vuna matunda yanapokuwa magumu na yanaanza kubadilika rangi, yahifadhi mahali penye kivuli na hewa, na usiweke matunda mabichi kwenye friji. Osha muda mfupi kabla ya kuuza.",
    },
  },
  {
    id: "fish",
    keywords: ["fish", "tilapia", "pond", "samaki", "green water", "algae", "oxygen"],
    answer: {
      en:
        "Green pond water usually means an algal bloom from nutrients in feed, fertilizer or runoff. Algae use up oxygen at night and early morning, which can kill fish. Reduce feeding for 1 to 2 days, check dissolved oxygen early in the morning and keep it above about 3 mg per litre, and do a 20 percent water change with clean water if oxygen drops. Keep runoff and latrines away from the pond.",
      sw:
        "Maji ya bwawa kuwa ya kijani kwa kawaida ni mwani unaokua kwa sababu ya virutubisho kutoka chakula, mbolea au maji ya mvua yanayoingia. Mwani hutumia oksijeni usiku na asubuhi mapema, jambo linaloweza kuua samaki. Punguza kulisha kwa siku 1 hadi 2, kagua oksijeni asubuhi mapema na uiweke juu ya takriban 3 mg kwa lita, na badilisha asilimia 20 ya maji kwa maji safi ikishuka. Weka maji ya mvua na vyoo mbali na bwawa.",
    },
  },
  {
    id: "dairy",
    keywords: ["milk", "dairy", "cow", "cattle", "maziwa", "ng'ombe", "mastitis", "udder"],
    answer: {
      en:
        "A sudden drop in milk yield usually comes from water intake, feed quality, the milking routine, or mastitis. Make sure the cows have clean water every day, check for mouldy silage or hay, and check each quarter of the udder for heat, swelling or clots. Call a vet the same day if the cow has a fever, is off her food, has a hot or swollen udder, or has blood in the milk.",
      sw:
        "Kushuka ghafla kwa maziwa kwa kawaida hutokana na maji, ubora wa chakula, ratiba ya kukamua, au ugonjwa wa kiwele. Hakikisha ng'ombe wana maji safi kila siku, angalia silaji au nyasi iliyoharibika, na kagua kila robo ya kiwele kwa joto, uvimbe au mabonge. Muite daktari wa mifugo siku hiyo hiyo ikiwa ng'ombe ana homa, hali, kiwele cha moto au damu kwenye maziwa.",
    },
  },
  {
    id: "planning",
    keywords: [
      "plan",
      "season",
      "market price",
      "price",
      "sell",
      "bei",
      "soko",
      "profit",
      "income",
    ],
    answer: {
      en:
        "Before planting, check the rainfall for your season, the market prices in your county and at your cooperative, and estimate costs for seed, fertilizer, pesticide, water and labour. Spread your risk across two or three crops, and keep simple records of each season. After a few seasons these records show which crops pay best on your land.",
      sw:
        "Kabla ya kupanda, angalia mvua za msimu wako, bei za soko la kaunti yako na la chama chako, na kadiria gharama za mbegu, mbolea, dawa, maji na kazi. Gawanya hatari kwenye mazao mawili au matatu, na weka kumbukumbu rahisi za kila msimu. Baada ya misimu michache, kumbukumbu hizi zinaonyesha mazao yanayolipa zaidi shambani kwako.",
    },
  },
] as const;

/** Answer returned when no topic matches. Still substantive, and it lists what the assistant covers. */
export const GENERAL_ANSWER: Record<Lang, string> = {
  en:
    "I can help with maize (including Maize Lethal Necrosis and fall armyworm), fertilizer rates, drought-tolerant crops and zai pits, beans, tomatoes, fish pond water, dairy cow health, and seasonal planning with market prices. Tell me the crop or problem you are dealing with, and roughly where in Kenya you farm, and I will give you specific advice.",
  sw:
    "Ninaweza kusaidia kuhusu mahindi (ikiwemo MLN na viwavi jeshi), viwango vya mbolea, mazao yanayostahimili ukame na mashimo ya zai, maharage, nyanya, maji ya bwawa la samaki, afya ya ng'ombe wa maziwa, na mipango ya msimu pamoja na bei za soko. Niambie zao au tatizo unalokabili, na mahali ulipo Kenya kwa ujumla, nami nitakupa ushauri mahususi.",
};
