import { Document, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer';
import type { Action } from '@kavach/schemas';

const styles = StyleSheet.create({
  page: { padding: 56, fontSize: 11, lineHeight: 1.5, fontFamily: 'Helvetica', color: '#1c1a17' },
  meta: { fontSize: 10, color: '#5e6472', marginBottom: 2 },
  rule: { borderBottomWidth: 1, borderBottomColor: '#ddd8ce', marginVertical: 14 },
  subject: { fontFamily: 'Helvetica-Bold', marginBottom: 12 },
  paragraph: { marginBottom: 8 },
  blank: { backgroundColor: '#fdf1dc' },
  footer: {
    position: 'absolute',
    bottom: 32,
    left: 56,
    right: 56,
    fontSize: 8,
    color: '#5e6472',
    borderTopWidth: 1,
    borderTopColor: '#ddd8ce',
    paddingTop: 6,
  },
});

/** Text with the "[____]" blanks the family still has to fill shaded. */
function Line({ text }: { text: string }) {
  const parts = text.split(/(\[____\])/);
  return (
    <Text style={styles.paragraph}>
      {parts.map((part, i) =>
        part === '[____]' ? (
          <Text key={i} style={styles.blank}>
            {'  ________  '}
          </Text>
        ) : (
          part
        ),
      )}
    </Text>
  );
}

/** The approved letter as an A4 PDF. Kavach never sends it; the family does. */
function LetterPdf({ action, approvedOn }: { action: Action; approvedOn: string }) {
  const [subjectLine = '', ...body] = action.content.split('\n');
  const paragraphs = body
    .join('\n')
    .split(/\n{2,}/)
    .filter(Boolean);
  return (
    <Document title={action.title} author="Kavach" creator="Kavach">
      <Page size="A4" style={styles.page}>
        {action.recipient && <Text style={styles.meta}>To: {action.recipient}</Text>}
        <Text style={styles.meta}>Date: {approvedOn}</Text>
        <View style={styles.rule} />
        <Text style={styles.subject}>{subjectLine}</Text>
        {paragraphs.map((p, i) => (
          <Line key={i} text={p} />
        ))}
        <Text style={styles.footer} fixed>
          Drafted by Kavach from your family details and approved by you on {approvedOn}. Fill the
          shaded blanks before sending. Kavach does not send letters for you; check the migration
          deadline with HR.
        </Text>
      </Page>
    </Document>
  );
}

export async function renderLetterPdf(action: Action, approvedOn: string): Promise<Buffer> {
  return renderToBuffer(<LetterPdf action={action} approvedOn={approvedOn} />);
}
