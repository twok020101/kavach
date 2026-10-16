import { Document, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 56,
    paddingBottom: 80,
    fontSize: 10.5,
    lineHeight: 1.45,
    fontFamily: 'Helvetica',
    color: '#1c1a17',
  },
  line: { minHeight: 15 },
  bold: { fontFamily: 'Helvetica-Bold' },
  gap: { height: 8 },
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

/**
 * The built-in PDF fonts have no ₹ glyph, so amounts print as "Rs. 14,560"
 * (the verifier reads both forms).
 */
const printable = (line: string) => line.replace(/₹\s?/g, 'Rs. ');

function AppealPdf({ text, title }: { text: string; title: string }) {
  return (
    <Document title={title} author="Kavach" creator="Kavach">
      <Page size="A4" style={styles.page}>
        {text.split('\n').map((line, i) =>
          line.trim() ? (
            <Text
              key={i}
              style={/^(Subject:|\d+\. )/.test(line) ? [styles.line, styles.bold] : styles.line}
            >
              {printable(line)}
            </Text>
          ) : (
            <View key={i} style={styles.gap} />
          ),
        )}
        <Text style={styles.footer} fixed>
          Drafted with Kavach. Every amount was checked against the rules engine and every quote
          against the policy wording before printing. Kavach does not send letters for you.
        </Text>
      </Page>
    </Document>
  );
}

/** Prints the verified appeal text on A4. */
export async function renderAppealPdf(text: string, title: string): Promise<Buffer> {
  return renderToBuffer(<AppealPdf text={text} title={title} />);
}
