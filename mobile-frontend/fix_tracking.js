const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'screens', 'dashboard', 'RecipientTrackingDetailScreen.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Remove the old Modal state and doConfirm state
content = content.replace(
    /  const \[confirmOpen, setConfirmOpen\] = useState\(false\);\n  const \[confirming, setConfirming\] = useState\(false\);\n  const \[confirmKind, setConfirmKind\] = useState<'delivery' | 'pickup'>\('delivery'\);/,
    `  const [confirming, setConfirming] = useState(false);`
);

// 2. Change doConfirm to accept 'kind' parameter instead of state
content = content.replace(
    /  const doConfirm = async \(\) => \{/,
    `  const doConfirm = async (kind: 'delivery' | 'pickup') => {`
);
content = content.replace(
    /      const endpoint = confirmKind === 'pickup' \? 'confirm-pickup' : 'confirm-received';/,
    `      const endpoint = kind === 'pickup' ? 'confirm-pickup' : 'confirm-received';`
);
content = content.replace(
    /      setConfirmOpen\(false\);\n/,
    ``
);
content = content.replace(
    /        confirmKind === 'pickup'/,
    `        kind === 'pickup'`
);

// 3. Update the Action row buttons to use CustomAlert
content = content.replace(
    /                onPress=\{\(\) => \{ setConfirmKind\('delivery'\); setConfirmOpen\(true\); \}\}/,
    `                onPress={() => {
                  CustomAlert.alert(
                    'Confirm Wig Received',
                    'Please confirm that you have received your wig. This action cannot be undone and will finalize your request.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Yes, I Received It', onPress: () => doConfirm('delivery') }
                    ]
                  );
                }}`
);
content = content.replace(
    /                onPress=\{\(\) => \{ setConfirmKind\('pickup'\); setConfirmOpen\(true\); \}\}/,
    `                onPress={() => {
                  CustomAlert.alert(
                    'Confirm Pickup',
                    'Please confirm only after you have personally collected your wig from the Binondo office. This will finalize your request.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Yes, I Collected My Wig', onPress: () => doConfirm('pickup') }
                    ]
                  );
                }}`
);

// 4. Remove the <Modal> entirely
const modalStart = content.indexOf('{/* Confirm modal */}');
if (modalStart !== -1) {
  const modalEnd = content.indexOf('</View>\n  );\n}', modalStart);
  content = content.substring(0, modalStart) + content.substring(modalEnd);
}

// 5. Remove unused modal styles
content = content.replace(
    /  modalBackdrop: \{[\s\S]*?modalConfirmText: \{ color: '#fff', fontWeight: '800', fontSize: ms\(14\) \},\n/g,
    ``
);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed Tracking Modal');
