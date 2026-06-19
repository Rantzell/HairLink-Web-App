const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'screens', 'dashboard', 'HairRequestHistoryScreen.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Add State
content = content.replace(
    /const \[confirming, setConfirming\] = useState\(false\);/,
    `const [confirming, setConfirming] = useState(false);
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

// 3. Add Modal JSX before the final </View> of the component
// The component ends with:
//       </ScrollView>
//     </View>
//   );
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
                disabled={confirming}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalConfirmBtn, confirming && { opacity: 0.7 }]}
                onPress={async () => {
                  if (!targetConfirmRef) return;
                  try {
                    setConfirming(true);
                    await api.post(\`/requests/\${targetConfirmRef}/confirm-received\`);
                    setConfirmOpen(false);
                    // Use standard alert just for success feedback since it's normal, or rely on UI
                    // but we will keep the success Alert.alert here just like tracking detail does.
                    Alert.alert('Confirmed', 'Thank you! Your wig request has been marked as completed.');
                    fetchHistory();
                  } catch (err: any) {
                    const msg = err?.response?.data?.message || 'Failed to confirm receipt.';
                    Alert.alert('Error', msg);
                  } finally {
                    setConfirming(false);
                  }
                }}
                disabled={confirming}
              >
                {confirming ? (
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
    /  detailsBtnText: \{ fontSize: ms\(13\), fontWeight: '900', color: '#B084CC', marginRight: ms\(4\) \},\n\}\);/,
    `  detailsBtnText: { fontSize: ms(13), fontWeight: '900', color: '#B084CC', marginRight: ms(4) },

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
console.log('Fixed HairRequestHistoryScreen Modal');
