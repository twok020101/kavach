import type { Locale, NotificationKind } from '@kavach/schemas';

/** Version of the consent text below; stored with each opt-in. */
export const CONSENT_VERSION = 'wa-2026-10-18';

type WaCopy = {
  consent: string;
  consentThanks: string;
  stopped: string;
  unknown: string;
  linkedDemo: (name: string) => string;
  rateLimited: string;
  offTopic: string;
  help: string;
  reading: string;
  notADocument: string;
  fullCard: string;
  letterNotApproved: string;
  readingLetter: string;
};

/** Every WhatsApp message Kavach writes itself (desk answers come from the desk core). */
export const WA_COPY: Record<Locale, WaCopy> = {
  en: {
    consent:
      'Hello! I am Kavach, your family’s insurance helper. Your photos and voice notes are read only to answer you, then deleted. Reply YES to continue, or STOP at any time.',
    consentThanks:
      'Thank you. Send a photo of the hospital estimate, a voice note or a question about your insurance.',
    stopped: 'You will get no more WhatsApp messages from Kavach. Send YES to start again.',
    unknown:
      'This number isn’t linked to a Kavach family yet. Ask your family to add it in the Kavach app, or send RAHUL to try the demo family.',
    linkedDemo: (name) =>
      `This number is now ${name} in a demo family (sample data). Family alerts come here.`,
    rateLimited: 'That’s a lot of messages at once. Please wait a few minutes and try again.',
    offTopic:
      'I can only help with insurance: hospital estimates, policies and claims. Send a photo of the estimate or ask about your cover.',
    help: 'Send a photo of the hospital estimate and ask which room to take. You can also send a voice note.',
    reading: 'Reading the estimate…',
    notADocument:
      'I couldn’t tell what this is. Please send a clear photo of the hospital estimate or the claim settlement letter.',
    fullCard: 'Full card',
    letterNotApproved:
      'The letter isn’t approved yet. Open Kavach, check it and tap Approve; then reply YES again.',
    readingLetter: 'Reading the settlement letter…',
  },
  hi: {
    consent:
      'नमस्ते! मैं Kavach हूँ, आपके परिवार की बीमा सहायक। आपकी फ़ोटो और आवाज़ सिर्फ़ जवाब देने के लिए पढ़ी जाती है, फिर हटा दी जाती है। आगे बढ़ने के लिए HAAN लिखें। कभी भी रोकने के लिए STOP लिखें।',
    consentThanks:
      'धन्यवाद। अस्पताल के एस्टिमेट की फ़ोटो, वॉइस नोट या अपने बीमा से जुड़ा सवाल भेजिए।',
    stopped: 'अब Kavach से WhatsApp मैसेज नहीं आएँगे। फिर से शुरू करने के लिए HAAN लिखें।',
    unknown:
      'यह नंबर अभी किसी Kavach परिवार से जुड़ा नहीं है। परिवार से कहिए कि Kavach ऐप में यह नंबर जोड़ें, या डेमो परिवार आज़माने के लिए RAHUL भेजिए।',
    linkedDemo: (name) =>
      `यह नंबर अब डेमो परिवार (नमूना डेटा) में ${name} है। परिवार के अलर्ट यहीं आएँगे।`,
    rateLimited: 'एक साथ बहुत सारे मैसेज आ गए। कुछ मिनट रुककर फिर भेजिए।',
    offTopic:
      'मैं सिर्फ़ बीमा में मदद कर सकती हूँ: अस्पताल का एस्टिमेट, पॉलिसी और क्लेम। एस्टिमेट की फ़ोटो भेजिए या अपने कवर के बारे में पूछिए।',
    help: 'अस्पताल के एस्टिमेट की फ़ोटो भेजिए और पूछिए कि कौन सा कमरा लें। आप वॉइस नोट भी भेज सकते हैं।',
    reading: 'एस्टिमेट पढ़ रही हूँ…',
    notADocument:
      'समझ नहीं आया कि यह क्या है। अस्पताल के एस्टिमेट या क्लेम सेटलमेंट लेटर की साफ़ फ़ोटो भेजिए।',
    fullCard: 'पूरा कार्ड',
    letterNotApproved:
      'लेटर अभी मंज़ूर नहीं हुआ है। Kavach खोलकर देखिए और Approve दबाइए; फिर दोबारा HAAN लिखिए।',
    readingLetter: 'सेटलमेंट पत्र पढ़ रही हूँ…',
  },
  ta: {
    consent:
      'வணக்கம்! நான் Kavach, உங்கள் குடும்பத்தின் இன்ஷூரன்ஸ் உதவியாளர். உங்கள் புகைப்படங்களும் குரல் குறிப்புகளும் பதில் சொல்ல மட்டுமே படிக்கப்பட்டு, பின் நீக்கப்படும். தொடர YES என்று பதிலளியுங்கள்; எப்போது வேண்டுமானாலும் STOP என்று அனுப்பலாம்.',
    consentThanks:
      'நன்றி. மருத்துவமனை எஸ்டிமேட்டின் புகைப்படம், குரல் குறிப்பு அல்லது உங்கள் இன்ஷூரன்ஸ் பற்றிய கேள்வியை அனுப்புங்கள்.',
    stopped:
      'இனி Kavach-இடமிருந்து WhatsApp செய்திகள் வராது. மீண்டும் தொடங்க YES என்று அனுப்புங்கள்.',
    unknown:
      'இந்த எண் இன்னும் எந்த Kavach குடும்பத்துடனும் இணைக்கப்படவில்லை. Kavach ஆப்பில் இதைச் சேர்க்கச் சொல்லுங்கள், அல்லது டெமோ குடும்பத்தைப் பார்க்க RAHUL என்று அனுப்புங்கள்.',
    linkedDemo: (name) =>
      `இந்த எண் இப்போது டெமோ குடும்பத்தில் (மாதிரித் தரவு) ${name}. குடும்ப எச்சரிக்கைகள் இங்கே வரும்.`,
    rateLimited: 'ஒரே நேரத்தில் நிறைய செய்திகள். சில நிமிடங்கள் காத்திருந்து மீண்டும் முயலுங்கள்.',
    offTopic:
      'நான் இன்ஷூரன்ஸில் மட்டுமே உதவ முடியும்: மருத்துவமனை எஸ்டிமேட், பாலிசிகள், கிளைம்கள். எஸ்டிமேட்டின் புகைப்படத்தை அனுப்புங்கள் அல்லது உங்கள் கவர் பற்றிக் கேளுங்கள்.',
    help: 'மருத்துவமனை எஸ்டிமேட்டின் புகைப்படத்தை அனுப்பி, எந்த அறை எடுக்கலாம் என்று கேளுங்கள். குரல் குறிப்பும் அனுப்பலாம்.',
    reading: 'எஸ்டிமேட்டைப் படிக்கிறேன்…',
    notADocument:
      'இது என்னவென்று புரியவில்லை. மருத்துவமனை எஸ்டிமேட் அல்லது கிளைம் செட்டில்மென்ட் கடிதத்தின் தெளிவான புகைப்படத்தை அனுப்புங்கள்.',
    fullCard: 'முழு கார்டு',
    letterNotApproved:
      'கடிதம் இன்னும் அங்கீகரிக்கப்படவில்லை. Kavach-ஐத் திறந்து சரிபார்த்து Approve-ஐத் தட்டுங்கள்; பிறகு மீண்டும் YES என்று பதிலளியுங்கள்.',
    readingLetter: 'செட்டில்மென்ட் கடிதத்தைப் படிக்கிறேன்…',
  },
  zh: {
    consent:
      '您好！我是 Kavach，您家庭的保险助手。您的照片和语音只用于回答您的问题，之后即删除。回复 YES 继续，随时可回复 STOP 停止。',
    consentThanks: '谢谢。请发送医院费用预估单的照片、语音，或关于您保险的问题。',
    stopped: '您不会再收到 Kavach 的 WhatsApp 消息。发送 YES 可重新开始。',
    unknown:
      '这个号码还没有关联任何 Kavach 家庭。请家人在 Kavach 应用中添加它，或发送 RAHUL 试用演示家庭。',
    linkedDemo: (name) => `这个号码现在是演示家庭（示例数据）中的${name}。家庭提醒会发到这里。`,
    rateLimited: '一次收到的消息太多了。请稍等几分钟再试。',
    offTopic:
      '我只能帮助保险相关的事：医院费用预估、保单和索赔。请发送预估单的照片，或询问您的保障。',
    help: '发送医院费用预估单的照片，并问我该选哪种病房。您也可以发送语音。',
    reading: '正在读取预估单…',
    notADocument: '我看不出这是什么。请发送医院费用预估单或理赔结算信的清晰照片。',
    fullCard: '完整卡片',
    letterNotApproved: '这封信还未获批准。请打开 Kavach 检查并点击“批准”，然后再回复 YES。',
    readingLetter: '正在读取结算信…',
  },
  ms: {
    consent:
      'Hai! Saya Kavach, pembantu insurans keluarga anda. Gambar dan nota suara anda dibaca hanya untuk menjawab anda, kemudian dipadam. Balas YES untuk teruskan, atau STOP pada bila-bila masa.',
    consentThanks:
      'Terima kasih. Hantar gambar anggaran hospital, nota suara atau soalan tentang insurans anda.',
    stopped:
      'Anda tidak akan menerima lagi mesej WhatsApp daripada Kavach. Hantar YES untuk mula semula.',
    unknown:
      'Nombor ini belum dipautkan dengan mana-mana keluarga Kavach. Minta keluarga anda menambahnya dalam aplikasi Kavach, atau hantar RAHUL untuk mencuba keluarga demo.',
    linkedDemo: (name) =>
      `Nombor ini kini ${name} dalam keluarga demo (data sampel). Makluman keluarga akan dihantar ke sini.`,
    rateLimited: 'Terlalu banyak mesej sekali gus. Sila tunggu beberapa minit dan cuba lagi.',
    offTopic:
      'Saya hanya boleh membantu dengan insurans: anggaran hospital, polisi dan tuntutan. Hantar gambar anggaran atau tanya tentang perlindungan anda.',
    help: 'Hantar gambar anggaran hospital dan tanya bilik mana yang patut diambil. Anda juga boleh hantar nota suara.',
    reading: 'Membaca anggaran…',
    notADocument:
      'Saya tidak pasti apa ini. Sila hantar gambar yang jelas bagi anggaran hospital atau surat penyelesaian tuntutan.',
    fullCard: 'Kad penuh',
    letterNotApproved:
      'Surat itu belum diluluskan. Buka Kavach, semak dan ketik Luluskan; kemudian balas YES sekali lagi.',
    readingLetter: 'Membaca surat penyelesaian…',
  },
};

/** Variables each notification kind needs (also the Meta template's body parameters, in order). */
export type NotifyVars = {
  household_alert: { patient: string; hospital: string; room: string; link?: string };
  dated_reminder: { date: string; action: string; link?: string };
};

/** Meta template parameters, in the order the approved template bodies use them (see README). */
export function templateParams<K extends NotificationKind>(kind: K, vars: NotifyVars[K]): string[] {
  if (kind === 'household_alert') {
    const v = vars as NotifyVars['household_alert'];
    return [v.patient, v.hospital, v.room];
  }
  const v = vars as NotifyVars['dated_reminder'];
  return [v.date, v.action];
}

const NOTIFY: Record<
  Locale,
  { tap: (link: string) => string; alert: (v: NotifyVars['household_alert']) => string }
> = {
  en: {
    tap: (link) => ` Tap to see: ${link}`,
    alert: (v) =>
      `${v.patient} is at ${v.hospital}. Kavach told the family to ask for the ${v.room} room.`,
  },
  hi: {
    tap: (link) => ` देखने के लिए खोलें: ${link}`,
    alert: (v) =>
      `${v.patient} ${v.hospital} में हैं। Kavach ने ${v.room} वाला कमरा माँगने को कहा।`,
  },
  ta: {
    tap: (link) => ` பார்க்க: ${link}`,
    alert: (v) =>
      `${v.patient} ${v.hospital}-இல் இருக்கிறார். ${v.room} அறையைக் கேட்கும்படி Kavach குடும்பத்திடம் சொன்னது.`,
  },
  zh: {
    tap: (link) => ` 点击查看：${link}`,
    alert: (v) => `${v.patient}在${v.hospital}。Kavach 告诉家人要求${v.room}病房。`,
  },
  ms: {
    tap: (link) => ` Ketik untuk lihat: ${link}`,
    alert: (v) =>
      `${v.patient} berada di ${v.hospital}. Kavach memberitahu keluarga untuk meminta bilik ${v.room}.`,
  },
};

/** The free-form (and in-app) text of a notification. */
export function notificationText<K extends NotificationKind>(
  kind: K,
  vars: NotifyVars[K],
  locale: Locale,
): string {
  const n = NOTIFY[locale];
  const tap = vars.link ? n.tap(vars.link) : '';
  if (kind === 'household_alert') return `${n.alert(vars as NotifyVars['household_alert'])}${tap}`;
  const v = vars as NotifyVars['dated_reminder'];
  return `${v.date}: ${v.action}${tap}`;
}
