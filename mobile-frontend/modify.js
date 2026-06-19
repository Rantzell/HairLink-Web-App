const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'screens', 'auth', 'SignupScreen.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Add BlurView import
content = content.replace(
    'import { LinearGradient } from "expo-linear-gradient";',
    'import { LinearGradient } from "expo-linear-gradient";\nimport { BlurView } from "expo-blur";'
);

// Replace Root gradients
content = content.replace(
    "colors={['#FAFAF9', '#FFE6F0']}",
    "colors={['#0F0510', '#1F0B18', '#380E28']}"
);
content = content.replace(
    "colors={['#FAFAF9', '#FFF0F8']}",
    "colors={['#0F0510', '#1F0B18', '#380E28']}"
);

// Add Ambient Lights
content = content.replace(
    "<KeyboardAvoidingView",
    `{/* Background ambient light effects */}
            <View style={[StyleSheet.absoluteFill, { opacity: 0.6 }]} pointerEvents='none'>
                <View style={{ position: 'absolute', top: -100, left: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: '#D63B8A', opacity: 0.3, transform: [{ scale: 2 }] }} />
                <View style={{ position: 'absolute', bottom: -50, right: -100, width: 250, height: 250, borderRadius: 125, backgroundColor: '#FF2A85', opacity: 0.2, transform: [{ scale: 2 }] }} />
            </View>

            <KeyboardAvoidingView`
);

// Gender Picker BlurView
content = content.replace(
    "                    {GENDERS.map((item) => (",
    `                    <BlurView intensity={40} tint="dark" style={{ borderRadius: 24, overflow: "hidden", padding: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}>
                    {GENDERS.map((item) => (`
);
content = content.replace(
    "                    <TouchableOpacity onPress={() => setPickingGender(false)} style={{ marginTop: 24, padding: 12 }}>",
    `                    </BlurView>
                    <TouchableOpacity onPress={() => setPickingGender(false)} style={{ marginTop: 24, padding: 12 }}>`
);

// Main Forms BlurView
content = content.replace(
    /<View style=\{styles\.glassCard\}>/g,
    '<BlurView intensity={40} tint="dark" style={styles.glassCard}>'
);
content = content.replace(
    /<\/View>\n(\s*)<\/Animated\.View>/g,
    '</BlurView>\n$1</Animated.View>'
);

// Progress bar
content = content.replace(
    /<Text style=\{styles\.subtitle\}>Step \{currentStep\} of 2<\/Text>/g,
    `<Text style={styles.subtitle}>Step {currentStep} of 2</Text>
                    <View style={{ flexDirection: "row", gap: 8, justifyContent: "center", marginTop: 16 }}>
                        <View style={{ height: 4, width: 40, borderRadius: 2, backgroundColor: "#D63B8A" }} />
                        <View style={{ height: 4, width: 40, borderRadius: 2, backgroundColor: currentStep === 2 ? "#D63B8A" : "rgba(255,255,255,0.2)" }} />
                    </View>`
);

// Styles
content = content.replace(/backgroundColor: '#FFF9FB'/g, "backgroundColor: 'rgba(255, 255, 255, 0.05)'");
content = content.replace(/borderColor: '#FFD9EC'/g, "borderColor: 'rgba(255, 255, 255, 0.1)'");
content = content.replace(/color: '#1a1a1a'/g, "color: '#FFF'");
content = content.replace(/color: '#999'/g, "color: '#A8A29E'");
content = content.replace(/backgroundColor: '#fff', \n(\s*)borderColor: '#D63B8A'/g, "backgroundColor: 'rgba(214, 59, 138, 0.15)', \n$1borderColor: '#D63B8A'");
content = content.replace(/backgroundColor: '#fff',\s*borderRadius: 30,\s*padding: 24,\s*shadowColor: '#E863A1',\s*shadowOffset: \{ width: 0, height: 10 \},\s*shadowOpacity: 0.1,\s*shadowRadius: 20,\s*elevation: 5,\s*borderWidth: 1,\s*borderColor: '#FFF0F5'/g, "backgroundColor: 'transparent',\n        borderRadius: 30,\n        padding: 24,\n        borderWidth: 1,\n        borderColor: 'rgba(255, 255, 255, 0.15)',\n        overflow: 'hidden'");
content = content.replace(/borderBottomColor: '#FFD9EC'/g, "borderBottomColor: 'rgba(255, 255, 255, 0.1)'");
content = content.replace(/backgroundColor: '#EEE'/g, "backgroundColor: 'rgba(255, 255, 255, 0.1)'");
content = content.replace(/backgroundColor: '#fff', justifyContent: 'center'/g, "backgroundColor: 'rgba(255, 255, 255, 0.1)', justifyContent: 'center'");
content = content.replace(/placeholderTextColor="#A8A29E"/g, 'placeholderTextColor="rgba(255,255,255,0.5)"');
content = content.replace(/color: '#888'/g, "color: '#FFF'");
content = content.replace(/color: '#000'/g, "color: '#FFF'");

// Special case: Fix Select Gender black title -> white title (since #1a1a1a doesn't match Select Gender title)
content = content.replace(
    "<Text style={[styles.title, { marginBottom: 24 }]}>Select Gender</Text>",
    "<Text style={[styles.title, { marginBottom: 24, color: '#FFF' }]}>Select Gender</Text>"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated SignupScreen.tsx');
