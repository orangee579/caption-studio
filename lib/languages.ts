export type LangCode =
  | "zh" | "en" | "ja" | "ko" | "es" | "pt"
  | "id" | "th" | "vi" | "ms" | "fr" | "de" | "ar";

export type LangMeta = {
  code: LangCode;
  label: string;
  nativeLabel: string;
  flag: string;
  platformHint: string;
  bannedTone: string;
};

export const LANGUAGES: LangMeta[] = [
  {
    code: "zh", label: "中文", nativeLabel: "中文", flag: "🇨🇳",
    platformHint: "中国抖音 / 小红书风格：短句、第一人称细节、网感词",
    bannedTone: "翻译腔、书面语、官方公告腔",
  },
  {
    code: "en", label: "English", nativeLabel: "English", flag: "🇺🇸",
    platformHint: "TikTok US: lowercase, abbreviations like 'pov', 'fr', 'no bc', 'icl', em-dashes",
    bannedTone: "formal, marketing-speak, AI-generated phrases like 'unleash', 'embrace', 'in today's world'",
  },
  {
    code: "ja", label: "日本語", nativeLabel: "日本語", flag: "🇯🇵",
    platformHint: "TikTok 日本：軽めの口語、絵文字最小限、半角カタカナや「〜」「！」のリズム",
    bannedTone: "丁寧すぎる敬語、CM のような言い回し、決まり文句",
  },
  {
    code: "ko", label: "한국어", nativeLabel: "한국어", flag: "🇰🇷",
    platformHint: "틱톡 한국: 반말 + 'ㅇㅈ', 'ㅋㅋ', '진짜', '레전드' 같은 인터넷 감성",
    bannedTone: "광고 카피체, 너무 정중한 존댓말",
  },
  {
    code: "es", label: "Español", nativeLabel: "Español", flag: "🇪🇸",
    platformHint: "TikTok ES/LATAM: tono coloquial, jerga local ('qué fuerte', 'literal', 'POV'), oraciones cortas",
    bannedTone: "tono publicitario, frases cliché tipo 'descubre', 'únete'",
  },
  {
    code: "pt", label: "Português", nativeLabel: "Português", flag: "🇧🇷",
    platformHint: "TikTok BR: gírias atuais ('mds', 'cara', 'tipo assim'), tom íntimo, frases curtas",
    bannedTone: "português formal de imprensa, frases prontas tipo 'não perca', 'descubra agora'",
  },
  {
    code: "id", label: "Bahasa Indonesia", nativeLabel: "Bahasa Indonesia", flag: "🇮🇩",
    platformHint: "TikTok ID: bahasa gaul ('gw', 'lo', 'banget', 'literally'), kalimat pendek, vibe Gen Z",
    bannedTone: "bahasa baku iklan, kata-kata template",
  },
  {
    code: "th", label: "ไทย", nativeLabel: "ไทย", flag: "🇹🇭",
    platformHint: "TikTok TH: ภาษาพูด, คำแสลง ('ปัง', 'อ่ะ', 'ฮือ'), ประโยคสั้น, มีอารมณ์",
    bannedTone: "ภาษาทางการแบบโฆษณา, ประโยคซ้ำซากแบบ AI",
  },
  {
    code: "vi", label: "Tiếng Việt", nativeLabel: "Tiếng Việt", flag: "🇻🇳",
    platformHint: "TikTok VN: tiếng lóng Gen Z ('xỉu', 'cạn lời', 'flex'), câu ngắn, cảm xúc thật",
    bannedTone: "văn quảng cáo, câu sáo rỗng kiểu 'khám phá ngay', 'đừng bỏ lỡ'",
  },
  {
    code: "ms", label: "Bahasa Melayu", nativeLabel: "Bahasa Melayu", flag: "🇲🇾",
    platformHint: "TikTok MY: bahasa pasar ('bro', 'gila', 'pecah'), nada santai, ayat pendek",
    bannedTone: "bahasa rasmi iklan, ayat cliché",
  },
  {
    code: "fr", label: "Français", nativeLabel: "Français", flag: "🇫🇷",
    platformHint: "TikTok FR: argot ('genre', 'trop', 'mdr', 'cheh'), phrases courtes, vibe Gen Z",
    bannedTone: "ton publicitaire, formules figées",
  },
  {
    code: "de", label: "Deutsch", nativeLabel: "Deutsch", flag: "🇩🇪",
    platformHint: "TikTok DE: lockerer Ton, Anglizismen ('cringe', 'lowkey'), kurze Sätze, Gen-Z Vibe",
    bannedTone: "Werbedeutsch, abgedroschene Phrasen",
  },
  {
    code: "ar", label: "العربية", nativeLabel: "العربية", flag: "🇸🇦",
    platformHint: "تيك توك العربي: عامية شبابية، جمل قصيرة، إيقاع سريع، إيموشن حقيقي",
    bannedTone: "أسلوب إعلاني، فصحى رسمية صارمة",
  },
];

export function getLang(code: string): LangMeta {
  return LANGUAGES.find((l) => l.code === code) || LANGUAGES[0];
}
