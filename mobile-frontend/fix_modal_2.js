const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'screens', 'dashboard', 'RecipientDashboard.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Add State. We'll search for "const [loading, setLoading] = useState"
content = content.replace(
    /const \[loading, setLoading\] = useState\(true\);/,
    `const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [targetConfirmRef, setTargetConfirmRef] = useState<string | null>(null);`
);

// 2. Replace confirmWigReceived function
content = content.replace(
    /const confirmWigReceived = \(reference: string\) => \{[\s\S]*?\n  \};/,
    `const confirmWigReceived = (reference: string) => {
    setTargetConfirmRef(reference);
    setConfirmOpen(true);
  };`
);

// 3. Add Modal JSX
content = content.replace(
    /      <\/ScrollView>\n    <\/View>\n  \);/,
    `      </ScrollView>

      {/* Confirm modal */}
      <Modal transparent visible={confirmOpen} animationType="fade" onRequestClose={() => setConfirmOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="checkmark-circle" size={ms(40)} color="#2E7D32" />
            </View>
            <Text style={styles.modalTitle}>Confirm Wig Received</Text>
            <Text style={styles.modalMsg}>
              Please confirm that you have received your wig. This action cannot be undone and will complete your request.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancelBtn]}
                onPress={() => setConfirmOpen(false)}
                disabled={loading}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalConfirmBtn, loading && { opacity: 0.7 }]}
                onPress={async () => {
                  if (!targetConfirmRef) return;
                  try {
                    setLoading(true);
                    await api.post(\`/requests/\${targetConfirmRef}/confirm-received\`);
                    setConfirmOpen(false);
                    Alert.alert('Success', 'Thank you! Your wig request is now complete.');
                    fetchDashboardData();
                  } catch (err: any) {
                    const msg = err?.response?.data?.message || 'Failed to confirm receipt.';
                    Alert.alert('Error', msg);
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmText}>Yes, I Received It</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );`
);

// 4. Add modal styles
content = content.replace(
    /  emptyDesc: \{ fontSize: ms\(13\), color: '#999', textAlign: 'center', marginTop: vs\(10\), lineHeight: ms\(20\), fontWeight: '600' \},\n\}\);/,
    `  emptyDesc: { fontSize: ms(13), color: '#999', textAlign: 'center', marginTop: vs(10), lineHeight: ms(20), fontWeight: '600' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: ms(20) },
  modalCard: { backgroundColor: '#fff', borderRadius: ms(22), padding: ms(24), width: '100%', maxWidth: ms(360), alignItems: 'center' },
  modalIconWrap: { width: ms(64), height: ms(64), borderRadius: ms(32), backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center', marginBottom: vs(12) },
  modalTitle: { fontSize: ms(18), fontWeight: '900', color: '#1a1a1a', marginBottom: vs(8) },
  modalMsg: { fontSize: ms(13), color: '#666', textAlign: 'center', marginBottom: vs(20), lineHeight: ms(20) },
  modalActions: { flexDirection: 'row', gap: ms(10), width: '100%' },
  modalBtn: { flex: 1, paddingVertical: vs(12), borderRadius: ms(12), alignItems: 'center' },
  modalCancelBtn: { backgroundColor: '#EEE' },
  modalCancelText: { color: '#666', fontWeight: '800', fontSize: ms(14) },
  modalConfirmBtn: { backgroundColor: '#2E7D32' },
  modalConfirmText: { color: '#fff', fontWeight: '800', fontSize: ms(14) },
});`
);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed RecipientDashboard Modal');
