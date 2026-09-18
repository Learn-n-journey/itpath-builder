/**
 * Country handling for the Tech Jobs board. Job boards write locations as free
 * text, so we map that text onto a small list of countries and keep an "ANY"
 * bucket for roles open worldwide.
 */

export interface JobCountry {
  code: string;
  name: string;
}

export const JOB_COUNTRIES: JobCountry[] = [
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "GB", name: "United Kingdom" },
  { code: "IE", name: "Ireland" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "NL", name: "Netherlands" },
  { code: "ES", name: "Spain" },
  { code: "PT", name: "Portugal" },
  { code: "IT", name: "Italy" },
  { code: "PL", name: "Poland" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "DK", name: "Denmark" },
  { code: "FI", name: "Finland" },
  { code: "CH", name: "Switzerland" },
  { code: "AT", name: "Austria" },
  { code: "BE", name: "Belgium" },
  { code: "AU", name: "Australia" },
  { code: "NZ", name: "New Zealand" },
  { code: "IN", name: "India" },
  { code: "SG", name: "Singapore" },
  { code: "JP", name: "Japan" },
  { code: "ZA", name: "South Africa" },
  { code: "BR", name: "Brazil" },
  { code: "MX", name: "Mexico" },
  { code: "AR", name: "Argentina" },
  { code: "AE", name: "United Arab Emirates" },
];

const COUNTRY_NAME = new Map(JOB_COUNTRIES.map((c) => [c.code, c.name]));

export function countryName(code: string): string {
  if (code === "ANY") return "Open worldwide";
  return COUNTRY_NAME.get(code) ?? code;
}

/** Patterns tried in order; the first match wins. */
const PATTERNS: { code: string; pattern: RegExp }[] = [
  { code: "US", pattern: /\b(usa|u\.s\.a?\.?|united states|america|americas)\b|\bus[- ]?(only|based|remote)\b|,\s*(al|ak|az|ar|ca|co|ct|de|fl|ga|hi|id|il|in|ia|ks|ky|la|me|md|ma|mi|mn|ms|mo|mt|ne|nv|nh|nj|nm|ny|nc|nd|oh|ok|or|pa|ri|sc|sd|tn|tx|ut|vt|va|wa|wv|wi|wy|dc)\b/i },
  { code: "CA", pattern: /\bcanada\b|\bcanadian\b|\b(toronto|vancouver|montreal|ottawa|calgary)\b/i },
  { code: "GB", pattern: /\b(uk|u\.k\.|united kingdom|england|scotland|wales|london|manchester|birmingham)\b/i },
  { code: "IE", pattern: /\bireland\b|\bdublin\b/i },
  { code: "DE", pattern: /\b(germany|deutschland|berlin|munich|münchen|hamburg|frankfurt|köln|cologne|stuttgart|düsseldorf|leipzig|dresden|nürnberg|nuremberg|hannover|bremen|essen|dortmund|karlsruhe|mannheim|bonn|münster)\b/i },
  { code: "AT", pattern: /\b(austria|österreich|vienna|wien|graz|salzburg|linz)\b/i },
  { code: "CH", pattern: /\b(switzerland|schweiz|zurich|zürich|geneva|basel|bern)\b/i },
  { code: "FR", pattern: /\b(france|paris|lyon|marseille|toulouse|bordeaux|nantes|lille)\b/i },
  { code: "NL", pattern: /\b(netherlands|holland|amsterdam|rotterdam|utrecht|eindhoven|the hague)\b/i },
  { code: "BE", pattern: /\b(belgium|brussels|antwerp|ghent)\b/i },
  { code: "ES", pattern: /\b(spain|españa|madrid|barcelona|valencia|sevilla|malaga|málaga)\b/i },
  { code: "PT", pattern: /\b(portugal|lisbon|lisboa|porto)\b/i },
  { code: "IT", pattern: /\b(italy|italia|rome|roma|milan|milano|turin|torino|naples)\b/i },
  { code: "PL", pattern: /\b(poland|polska|warsaw|warszawa|krakow|kraków|wroclaw|wrocław|gdansk|gdańsk|poznan|poznań)\b/i },
  { code: "SE", pattern: /\b(sweden|sverige|stockholm|gothenburg|malmö|malmo)\b/i },
  { code: "NO", pattern: /\b(norway|norge|oslo|bergen)\b/i },
  { code: "DK", pattern: /\b(denmark|danmark|copenhagen|københavn|aarhus)\b/i },
  { code: "FI", pattern: /\b(finland|suomi|helsinki|espoo|tampere)\b/i },
  { code: "AU", pattern: /\b(australia|sydney|melbourne|brisbane|perth|canberra|adelaide)\b/i },
  { code: "NZ", pattern: /\b(new zealand|auckland|wellington|christchurch)\b/i },
  { code: "IN", pattern: /\b(india|bangalore|bengaluru|hyderabad|mumbai|pune|chennai|delhi|noida|gurgaon|gurugram)\b/i },
  { code: "SG", pattern: /\bsingapore\b/i },
  { code: "JP", pattern: /\b(japan|tokyo|osaka|kyoto)\b/i },
  { code: "ZA", pattern: /\b(south africa|johannesburg|cape town|pretoria|durban)\b/i },
  { code: "BR", pattern: /\b(brazil|brasil|são paulo|sao paulo|rio de janeiro|belo horizonte)\b/i },
  { code: "MX", pattern: /\b(mexico|méxico|mexico city|guadalajara|monterrey)\b/i },
  { code: "AR", pattern: /\b(argentina|buenos aires|córdoba|cordoba)\b/i },
  { code: "AE", pattern: /\b(united arab emirates|uae|dubai|abu dhabi)\b/i },
];

const WORLDWIDE = /\b(worldwide|anywhere|global|remote only|fully remote|any location|international)\b/i;

/**
 * Work out which country a posting belongs to. Returns an ISO code, "ANY" for
 * roles open worldwide, or undefined when the text says nothing useful.
 */
export function detectJobCountry(...parts: (string | undefined)[]): string | undefined {
  const text = parts.filter(Boolean).join(" ");
  if (!text.trim()) return undefined;
  for (const { code, pattern } of PATTERNS) {
    if (pattern.test(text)) return code;
  }
  if (WORLDWIDE.test(text)) return "ANY";
  return undefined;
}

/** True when a posting is open to someone living in the given country. */
export function jobMatchesCountry(jobCountry: string | undefined, wanted: string): boolean {
  if (wanted === "all") return true;
  if (!jobCountry) return false;
  return jobCountry === wanted || jobCountry === "ANY";
}
