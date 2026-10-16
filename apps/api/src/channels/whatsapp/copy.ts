import type { Locale, NotificationKind } from '@kavach/schemas';

/** Version of the consent text below; stored with each opt-in. */
export const CONSENT_VERSION = 'wa-2026-10-16';

/** Every WhatsApp message Kavach writes itself (desk answers come from the desk core). */
export const WA_COPY = {
  en: {
    consent:
      'Hello! I am Kavach, your family’s insurance helper. Your photos and voice notes are read only to answer you, then deleted. Reply YES to continue, or STOP at any time.',
    consentThanks:
      'Thank you. Send a photo of the hospital estimate, a voice note or a question about your insurance.',
    stopped: 'You will get no more WhatsApp messages from Kavach. Send YES to start again.',
    unknown:
      'This number isn’t linked to a Kavach family yet. Ask your family to add it in the Kavach app, or send RAHUL to try the demo family.',
    linkedDemo: (name: string) =>
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
    claimSoon:
      'Thanks, I got the settlement letter. Claim reading on WhatsApp is coming soon; for now, open the Kavach app to check it.',
  },
  hi: {
    consent:
      'नमस्ते! मैं Kavach हूँ, आपके परिवार की बीमा सहायक। आपकी फ़ोटो और आवाज़ सिर्फ़ जवाब देने के लिए पढ़ी जाती है, फिर हटा दी जाती है। आगे बढ़ने के लिए HAAN लिखें। कभी भी रोकने के लिए STOP लिखें।',
    consentThanks:
      'धन्यवाद। अस्पताल के एस्टिमेट की फ़ोटो, वॉइस नोट या अपने बीमा से जुड़ा सवाल भेजिए।',
    stopped: 'अब Kavach से WhatsApp मैसेज नहीं आएँगे। फिर से शुरू करने के लिए HAAN लिखें।',
    unknown:
      'यह नंबर अभी किसी Kavach परिवार से जुड़ा नहीं है। परिवार से कहिए कि Kavach ऐप में यह नंबर जोड़ें, या डेमो परिवार आज़माने के लिए RAHUL भेजिए।',
    linkedDemo: (name: string) =>
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
    claimSoon:
      'धन्यवाद, सेटलमेंट लेटर मिल गया। WhatsApp पर क्लेम पढ़ना जल्द आ रहा है; अभी Kavach ऐप में खोलकर देखिए।',
  },
} satisfies Record<Locale, unknown>;

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

/** The free-form (and in-app) text of a notification. */
export function notificationText<K extends NotificationKind>(
  kind: K,
  vars: NotifyVars[K],
  locale: Locale,
): string {
  const tap = vars.link
    ? locale === 'hi'
      ? ` देखने के लिए खोलें: ${vars.link}`
      : ` Tap to see: ${vars.link}`
    : '';
  if (kind === 'household_alert') {
    const v = vars as NotifyVars['household_alert'];
    return locale === 'hi'
      ? `${v.patient} ${v.hospital} में हैं। Kavach ने ${v.room} वाला कमरा माँगने को कहा।${tap}`
      : `${v.patient} is at ${v.hospital}. Kavach told the family to ask for the ${v.room} room.${tap}`;
  }
  const v = vars as NotifyVars['dated_reminder'];
  return `${v.date}: ${v.action}${tap}`;
}
