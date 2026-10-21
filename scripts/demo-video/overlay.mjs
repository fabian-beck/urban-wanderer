// In-page overlay for the recording: title and section slides, tap ripples, and the fast-forward
// badge. Playwright serializes this function into the page (context.addInitScript), so it must not
// reference anything outside its body. The journey drives it through window.__demo.
export function installOverlay() {
	const css = `
		.demo-tap {
			position: fixed; width: 44px; height: 44px; margin: -22px 0 0 -22px;
			border-radius: 50%; border: 3px solid rgba(37, 99, 235, 0.9);
			background: rgba(37, 99, 235, 0.25); pointer-events: none; z-index: 2147483647;
			animation: demo-tap 450ms ease-out forwards;
		}
		@keyframes demo-tap {
			from { transform: scale(0.4); opacity: 1; }
			to { transform: scale(1.4); opacity: 0; }
		}
		.demo-badge {
			position: fixed; top: 8px; left: 50%; transform: translateX(-50%); z-index: 2147483646;
			font: 600 13px/1.35 system-ui, sans-serif; color: #fff; pointer-events: none;
			background: rgba(180, 83, 9, 0.92); border-radius: 999px; padding: 4px 12px;
			box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
		}
		.demo-slide {
			position: fixed; inset: 0; z-index: 2147483645; pointer-events: none;
			display: flex; align-items: center; justify-content: center; padding: 40px 32px;
			background: #000; transition: opacity 500ms ease;
		}
		.demo-slide-content {
			display: flex; flex-direction: column; align-items: center; gap: 18px; text-align: center;
			font-family: system-ui, sans-serif; transition: opacity 250ms ease;
		}
		.demo-slide-kicker {
			font-size: 13px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;
			color: #a3a3a3;
		}
		.demo-slide-title { font-size: 34px; font-weight: 700; line-height: 1.2; color: #fff; }
		.demo-slide-subtitle { font-size: 17px; line-height: 1.45; color: #d4d4d4; }
		.demo-hidden { opacity: 0; }`;

	let badge;
	let slide;
	let slideContent;
	let badgeTimer;
	let slideTimer;

	const ensureOverlay = () => {
		if (badge?.isConnected) {
			return;
		}
		const style = document.createElement('style');
		style.textContent = css;
		document.head.appendChild(style);
		badge = document.createElement('div');
		badge.className = 'demo-badge demo-hidden';
		badge.textContent = '⏩ Fast-forward';
		slide = document.createElement('div');
		slide.className = 'demo-slide demo-hidden';
		slideContent = document.createElement('div');
		slideContent.className = 'demo-slide-content';
		slide.append(slideContent);
		document.body.append(slide, badge);
	};

	const element = (tag, className, text) => {
		const node = document.createElement(tag);
		node.className = className;
		node.textContent = text;
		return node;
	};

	window.__demo = {
		// Covers the app with a slide ({ kicker, title, subtitle }), styled apart from the app; a slide
		// that follows another one replaces its text in place
		showSlide({ kicker, title, subtitle }) {
			ensureOverlay();
			const render = () => {
				slideContent.replaceChildren(
					...[
						kicker && element('div', 'demo-slide-kicker', kicker),
						element('div', 'demo-slide-title', title),
						subtitle && element('div', 'demo-slide-subtitle', subtitle)
					].filter(Boolean)
				);
				slideContent.classList.remove('demo-hidden');
			};
			clearTimeout(slideTimer);
			if (slide.classList.contains('demo-hidden')) {
				render();
				slide.classList.remove('demo-hidden');
			} else {
				slideContent.classList.add('demo-hidden');
				slideTimer = setTimeout(render, 250);
			}
		},
		hideSlide() {
			slide?.classList.add('demo-hidden');
		},
		waitStarted(badgeDelayMs) {
			ensureOverlay();
			clearTimeout(badgeTimer);
			badgeTimer = setTimeout(() => badge.classList.remove('demo-hidden'), badgeDelayMs);
		},
		waitEnded() {
			clearTimeout(badgeTimer);
			badge?.classList.add('demo-hidden');
		},
		// True when no slide, badge, or tap ripple is on screen, so a still shows only the app
		idle() {
			return (
				(!badge || badge.classList.contains('demo-hidden')) &&
				(!slide || slide.classList.contains('demo-hidden')) &&
				!document.querySelector('.demo-tap')
			);
		}
	};

	document.addEventListener(
		'pointerdown',
		(event) => {
			const ripple = document.createElement('div');
			ripple.className = 'demo-tap';
			ripple.style.left = `${event.clientX}px`;
			ripple.style.top = `${event.clientY}px`;
			ensureOverlay();
			document.body.appendChild(ripple);
			setTimeout(() => ripple.remove(), 500);
		},
		true
	);
}
