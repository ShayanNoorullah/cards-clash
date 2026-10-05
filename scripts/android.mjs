/**
 * Runs a Gradle task in android/ (after `npm run android:sync`).
 *
 *   node scripts/android.mjs apk   → android/app/build/outputs/apk/debug/app-debug.apk
 *   node scripts/android.mjs aab   → android/app/build/outputs/bundle/release/app-release.aab
 *
 * The release bundle is signed when android/keystore.properties exists (see
 * docs/RELEASE.md); otherwise Gradle leaves it unsigned.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const task = { apk: 'assembleDebug', aab: 'bundleRelease', release: 'assembleRelease' }[
  process.argv[2] ?? 'apk'
];
if (!task) throw new Error('Usage: node scripts/android.mjs apk|aab|release');

// Capacitor 7 needs JDK 21: use ANDROID_JAVA_HOME, else Android Studio's bundled
// JDK, else JAVA_HOME (which is often an older JDK).
const env = { ...process.env };
const studio = [
  'C:/Program Files/Android/Android Studio/jbr',
  '/Applications/Android Studio.app/Contents/jbr/Contents/Home',
  '/opt/android-studio/jbr',
].find((p) => existsSync(p));
const javaHome = env.ANDROID_JAVA_HOME ?? studio ?? env.JAVA_HOME;
if (javaHome) env.JAVA_HOME = javaHome;
const cwd = join(process.cwd(), 'android');
// Quoted: the project path may contain spaces (cmd needs the quotes with shell: true).
const gradlew = process.platform === 'win32' ? `"${join(cwd, 'gradlew.bat')}"` : './gradlew';
const r = spawnSync(gradlew, [task, '--no-daemon'], {
  cwd,
  env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
process.exit(r.status ?? 1);
