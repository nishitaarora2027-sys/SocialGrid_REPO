import type { ContentType, Industry } from "@/lib/types";

export interface Idea {
  key: string;
  title_en: string;
  title_hi: string;
  content_type: ContentType;
}

const FOOD: Idea[] = [
  { key: "bestseller", title_en: "Show off your best-selling dish", title_hi: "अपना सबसे ज़्यादा बिकने वाला पकवान दिखाएँ", content_type: "single_post" },
  { key: "kitchen_reel", title_en: "A quick reel of your kitchen in action", title_hi: "आपके किचन की एक छोटी रील", content_type: "reel" },
  { key: "review", title_en: "Share a happy customer's review", title_hi: "किसी खुश ग्राहक का रिव्यू शेयर करें", content_type: "single_post" },
  { key: "combo", title_en: "Announce a combo or weekend offer", title_hi: "कोई कॉम्बो या वीकेंड ऑफ़र बताएँ", content_type: "single_post" },
  { key: "menu_carousel", title_en: "A menu carousel of your top 5 items", title_hi: "आपके टॉप 5 आइटम का मेन्यू कैरोसेल", content_type: "carousel" },
];

const SALON: Idea[] = [
  { key: "before_after", title_en: "A before & after of a recent makeover", title_hi: "किसी हाल के मेकओवर का पहले और बाद", content_type: "carousel" },
  { key: "styling_reel", title_en: "A quick hair-styling reel", title_hi: "हेयर स्टाइलिंग की एक छोटी रील", content_type: "reel" },
  { key: "review", title_en: "Share a happy customer's review", title_hi: "किसी खुश ग्राहक का रिव्यू शेयर करें", content_type: "single_post" },
  { key: "package", title_en: "Promote a festive or bridal package", title_hi: "कोई त्योहार या ब्राइडल पैकेज बताएँ", content_type: "single_post" },
  { key: "tips", title_en: "Share 3 hair or skin care tips", title_hi: "बालों या त्वचा की देखभाल के 3 टिप्स", content_type: "carousel" },
];

export function ideasFor(industry: Industry) {
  return industry === "salon" ? SALON : FOOD;
}
