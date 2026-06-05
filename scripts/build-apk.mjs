import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const androidDir = path.join(rootDir, 'android');
const hidriveExportDir = 'C:\\Users\\ba5tm7\\HiDrive\\Temp';
const isRelease = process.argv.includes('--release');
const gradleTask = isRelease ? 'assembleRelease' : 'assembleDebug';
const apkVariantDir = path.join(
	androidDir,
	'app',
	'build',
	'outputs',
	'apk',
	isRelease ? 'release' : 'debug'
);
const env = { ...process.env };

if (!env.JAVA_HOME && process.platform === 'win32') {
	const bundledAndroidStudioJdk = 'C:\\Program Files\\Android\\Android Studio\\jbr';

	if (existsSync(path.join(bundledAndroidStudioJdk, 'bin', 'java.exe'))) {
		env.JAVA_HOME = bundledAndroidStudioJdk;
		console.log(`Using JAVA_HOME=${env.JAVA_HOME}`);
	}
}

run('npm', ['run', 'build'], rootDir);
run('npx', ['cap', 'sync', 'android'], rootDir);
run(process.platform === 'win32' ? 'gradlew.bat' : './gradlew', [gradleTask], androidDir);

const apk = findNewestApk(apkVariantDir);

if (apk) {
	const timestampedApk = copyTimestampedApk(apk);

	console.log(`\nAPK built: ${path.relative(rootDir, apk)}`);
	console.log(`Timestamped APK: ${path.relative(rootDir, timestampedApk)}`);

	if (isDirectory(hidriveExportDir)) {
		const hidriveApk = path.join(hidriveExportDir, path.basename(timestampedApk));

		copyFileSync(timestampedApk, hidriveApk);
		console.log(`Copied APK to: ${hidriveApk}`);
	} else {
		console.log(`HiDrive export skipped; directory not found: ${hidriveExportDir}`);
	}
}

function run(command, args, cwd) {
	console.log(`\n> ${command} ${args.join(' ')}`);

	const result =
		process.platform === 'win32'
			? spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', toCmdLine(command, args)], {
					cwd,
					env,
					stdio: 'inherit'
				})
			: spawnSync(command, args, {
					cwd,
					env,
					stdio: 'inherit'
				});

	if (result.error) {
		console.error(result.error.message);
		process.exit(1);
	}

	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}
}

function toCmdLine(command, args) {
	return [command, ...args].map(quoteCmdArgument).join(' ');
}

function quoteCmdArgument(value) {
	if (!/[ \t"&()<>^|]/.test(value)) {
		return value;
	}

	return `"${value.replace(/"/g, '\\"')}"`;
}

function findNewestApk(directory) {
	if (!existsSync(directory)) {
		return null;
	}

	return readdirSync(directory)
		.filter((file) => file.endsWith('.apk'))
		.map((file) => path.join(directory, file))
		.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
}

function copyTimestampedApk(apk) {
	const timestamp = formatTimestamp(new Date());
	const variant = isRelease ? 'release' : 'debug';
	const timestampedApk = path.join(path.dirname(apk), `urban-wanderer-${variant}-${timestamp}.apk`);

	copyFileSync(apk, timestampedApk);

	return timestampedApk;
}

function formatTimestamp(date) {
	const parts = [
		date.getFullYear(),
		pad(date.getMonth() + 1),
		pad(date.getDate()),
		'-',
		pad(date.getHours()),
		pad(date.getMinutes()),
		pad(date.getSeconds())
	];

	return parts.join('');
}

function pad(value) {
	return String(value).padStart(2, '0');
}

function isDirectory(directory) {
	return existsSync(directory) && statSync(directory).isDirectory();
}
