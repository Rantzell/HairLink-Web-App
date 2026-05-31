import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';

/* ──────────────────────────────────────────────────────────────
   Scoped styles — all classes prefixed "hl-" to avoid
   any conflict with legacy CSS files.
   ────────────────────────────────────────────────────────────── */
const hlStyles = `
/* ── Reset scope ── */
.hl-root * { box-sizing: border-box; }
.hl-root a { text-decoration: none; }

/* ── Root wrapper ── */
.hl-root {
  font-family: 'Inter', sans-serif;
  color: #1C1917;
  background: #FAFAF9;
  min-height: 100vh;
}

/* ═══════════════════════════════════════════════════════
   NAV
═══════════════════════════════════════════════════════ */
.hl-nav {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 100;
  height: 64px;
  background: rgba(250,250,249,0.90);
  border-bottom: 1px solid #EEEDE8;
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

.hl-nav-inner {
  max-width: 1320px;
  margin: 0 auto;
  padding: 0 clamp(20px,4vw,56px);
  height: 100%;
  display: flex;
  align-items: center;
  gap: 2rem;
}

.hl-logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: 'Outfit', sans-serif;
  font-weight: 700;
  font-size: 1.1rem;
  color: #1C1917;
  letter-spacing: -0.01em;
  flex-shrink: 0;
}

.hl-logo img {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.hl-nav-links {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-left: auto;
}

.hl-nav-links a {
  padding: 0.45rem 0.9rem;
  border-radius: 999px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #57534E;
  transition: all 0.18s ease;
}

.hl-nav-links a:hover {
  color: #1C1917;
  background: #F5F5F0;
}

.hl-nav-divider {
  width: 1px;
  height: 20px;
  background: #EEEDE8;
  margin: 0 0.5rem;
}

.hl-btn-ghost {
  display: inline-flex;
  align-items: center;
  padding: 0.45rem 1rem;
  border-radius: 999px;
  border: 1.5px solid #D6D3CD;
  font-size: 0.875rem;
  font-weight: 600;
  color: #44403C;
  background: #fff;
  transition: all 0.18s ease;
  white-space: nowrap;
}

.hl-btn-ghost:hover {
  border-color: #D63B8A;
  color: #D63B8A;
}

.hl-btn-primary {
  display: inline-flex;
  align-items: center;
  padding: 0.45rem 1.1rem;
  border-radius: 999px;
  font-size: 0.875rem;
  font-weight: 600;
  color: #ad246d;
  background: #fce4ec;
  border: 1.5px solid #f8bbd9;
  transition: all 0.18s ease;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(214,59,138,.12);
}

.hl-btn-primary:hover {
  background: #f48fb1;
  border-color: #f48fb1;
  color: #fff;
  box-shadow: 0 4px 14px rgba(214,59,138,.25);
  transform: translateY(-1px);
}

/* Hamburger */
.hl-burger {
  display: none;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid #EEEDE8;
  background: #fff;
  cursor: pointer;
  margin-left: auto;
}

.hl-burger span {
  width: 18px;
  height: 2px;
  background: #57534E;
  border-radius: 2px;
  display: block;
  transition: all 0.2s ease;
}

.hl-drawer {
  display: none;
  position: fixed;
  top: 64px; left: 0; right: 0;
  background: rgba(250,250,249,0.98);
  border-bottom: 1px solid #EEEDE8;
  padding: 1rem clamp(20px,4vw,56px) 1.5rem;
  z-index: 99;
  flex-direction: column;
  gap: 0.25rem;
  box-shadow: 0 8px 24px rgba(28,25,23,.08);
}

.hl-drawer.open { display: flex; }
.hl-drawer a, .hl-drawer button {
  padding: 0.7rem 0.75rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  color: #57534E;
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  transition: all 0.15s ease;
}
.hl-drawer a:hover, .hl-drawer button:hover { background: #F5F5F0; color: #1C1917; }

/* ═══════════════════════════════════════════════════════
   HERO — 3D layered composition
═══════════════════════════════════════════════════════ */
.hl-hero {
  min-height: 100vh;
  padding-top: 64px;
  display: flex;
  align-items: center;
  position: relative;
  overflow: hidden;
  background: #FAFAF9;
}

/* Hair image as full hero background */
.hl-hero-bg-hair {
  position: absolute;
  inset: 0;
  background-image: url('/assets/images/landing/dark_flowing_hair_bg.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  opacity: 0.32;
  z-index: 0;
  pointer-events: none;
}

/* Readability wash — strong cream on left fading to transparent on right */
.hl-hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(250,250,249,0.92) 0%, rgba(250,250,249,0.72) 30%, rgba(250,250,249,0.25) 55%, transparent 75%),
    radial-gradient(ellipse 55% 45% at 8% 18%,  rgba(214,59,138,0.10) 0%, transparent 65%),
    radial-gradient(ellipse 45% 55% at 96% 82%, rgba(232,128,188,0.13) 0%, transparent 60%),
    radial-gradient(ellipse 35% 30% at 50% 102%, rgba(255,144,204,0.08) 0%, transparent 70%);
  z-index: 1;
  pointer-events: none;
}

/* 3D floating gradient orbs */
.hl-hero-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  z-index: 0;
  pointer-events: none;
  animation: hlOrbDrift 14s ease-in-out infinite;
}
.hl-orb-1 {
  width: 460px; height: 460px;
  background: radial-gradient(circle, #FF8FCC 0%, transparent 70%);
  top: -140px; right: -60px;
  opacity: 0.55;
  animation-delay: -2s;
}
.hl-orb-2 {
  width: 360px; height: 360px;
  background: radial-gradient(circle, #D63B8A 0%, transparent 70%);
  bottom: -120px; left: -100px;
  opacity: 0.32;
  animation-delay: -6s;
}
.hl-orb-3 {
  width: 220px; height: 220px;
  background: radial-gradient(circle, #E448A0 0%, transparent 70%);
  top: 38%; right: 28%;
  opacity: 0.25;
  animation-delay: -10s;
}

@keyframes hlOrbDrift {
  0%,100% { transform: translate(0,0) scale(1); }
  33%     { transform: translate(20px,-15px) scale(1.05); }
  66%     { transform: translate(-15px,10px) scale(0.97); }
}

/* Subtle dotted grid with radial mask */
.hl-hero-dots {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle at 1.5px 1.5px, rgba(28,25,23,0.09) 1.4px, transparent 0);
  background-size: 34px 34px;
  z-index: 0;
  pointer-events: none;
  -webkit-mask-image: radial-gradient(ellipse 75% 65% at 50% 50%, black 25%, transparent 80%);
          mask-image: radial-gradient(ellipse 75% 65% at 50% 50%, black 25%, transparent 80%);
}

/* Geometric accent shapes (depth layer) */
.hl-hero-shape {
  position: absolute;
  z-index: 0;
  pointer-events: none;
  border-radius: 24px;
  animation: hlShapeFloat 9s ease-in-out infinite;
}
.hl-shape-1 {
  width: 84px; height: 84px;
  background: linear-gradient(135deg, #FFE0EE 0%, #FFB8E4 100%);
  top: 14%; left: 6%;
  transform: rotate(18deg);
  box-shadow: 0 12px 28px rgba(214,59,138,0.18);
  animation-delay: -1s;
}
.hl-shape-2 {
  width: 56px; height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #D63B8A 0%, #8B1A52 100%);
  bottom: 18%; left: 42%;
  box-shadow: 0 10px 24px rgba(139,26,82,0.30);
  animation-delay: -4s;
}
.hl-shape-3 {
  width: 36px; height: 36px;
  background: #1C1917;
  bottom: 30%; left: 16%;
  border-radius: 8px;
  transform: rotate(-12deg);
  box-shadow: 0 8px 18px rgba(28,25,23,0.25);
  animation-delay: -7s;
}

@keyframes hlShapeFloat {
  0%,100% { transform: translateY(0) rotate(var(--r,0deg)); }
  50%     { transform: translateY(-14px) rotate(calc(var(--r,0deg) + 6deg)); }
}
.hl-shape-1 { --r: 18deg; }
.hl-shape-3 { --r: -12deg; }

.hl-hero-inner {
  max-width: 1320px;
  margin: 0 auto;
  padding: clamp(48px,7vw,96px) clamp(20px,4vw,56px);
  width: 100%;
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: 1.05fr 1fr;
  align-items: center;
  gap: clamp(40px, 6vw, 90px);
}

.hl-hero-text {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 580px;
}

.hl-hero-copy {
  font-size: clamp(1rem, 1.4vw, 1.08rem);
  line-height: 1.7;
  color: #57534E;
  max-width: 460px;
  margin: 0;
  font-weight: 400;
}

/* ── Trust strip below CTAs ── */
.hl-hero-trust {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  margin-top: 0.6rem;
}
.hl-hero-avts { display: flex; }
.hl-hero-avt {
  width: 30px; height: 30px;
  border-radius: 50%;
  background: linear-gradient(135deg, #FFB8E4 0%, #D63B8A 100%);
  border: 2.5px solid #FAFAF9;
  margin-left: -8px;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Outfit', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  color: #fff;
  box-shadow: 0 4px 10px rgba(214,59,138,0.22);
}
.hl-hero-avt:first-child { margin-left: 0; }
.hl-hero-avt.dark { background: linear-gradient(135deg, #44403C 0%, #1C1917 100%); }
.hl-hero-trust-text {
  font-size: 0.82rem;
  color: #57534E;
  line-height: 1.5;
  margin: 0;
}
.hl-hero-trust-text strong { color: #1C1917; font-weight: 700; }

/* ── Hero visual — layered 3D composition ── */
.hl-hero-visual {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  perspective: 1200px;
}

.hl-hero-card {
  position: relative;
  width: clamp(280px, 34vw, 460px);
  aspect-ratio: 4/5;
  border-radius: 28px;
  overflow: hidden;
  box-shadow:
    0 32px 64px rgba(214,59,138,0.22),
    0 14px 28px rgba(28,25,23,0.12),
    inset 0 0 0 1px rgba(255,255,255,0.5);
  transform: rotate(-3deg);
  transition: transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
  z-index: 2;
}

.hl-hero-card:hover { transform: rotate(-1deg) translateY(-6px) scale(1.01); }

.hl-hero-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* Soft gradient overlay on card */
.hl-hero-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(0,0,0,0) 60%, rgba(28,25,23,0.30) 100%),
    linear-gradient(140deg, rgba(214,59,138,0.10) 0%, rgba(0,0,0,0) 50%);
  pointer-events: none;
}

/* Floating stat pop-card */
.hl-hero-float-stat {
  position: absolute;
  top: 4%;
  left: -10%;
  background: rgba(255,255,255,0.94);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.8);
  border-radius: 16px;
  padding: 12px 16px;
  box-shadow: 0 16px 36px rgba(28,25,23,0.14), 0 4px 10px rgba(214,59,138,0.08);
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 3;
  animation: hlFloatA 6s ease-in-out infinite;
}
.hl-hero-float-stat-icon {
  width: 38px; height: 38px;
  border-radius: 10px;
  background: linear-gradient(135deg, #FFB8E4 0%, #D63B8A 100%);
  display: flex; align-items: center; justify-content: center;
  font-size: 18px;
  box-shadow: 0 6px 14px rgba(214,59,138,0.32);
  flex-shrink: 0;
}
.hl-hero-float-stat-info { display: flex; flex-direction: column; line-height: 1; }
.hl-hero-float-stat-num {
  font-family: 'Outfit', sans-serif;
  font-size: 1.2rem;
  font-weight: 700;
  color: #1C1917;
  letter-spacing: -0.02em;
}
.hl-hero-float-stat-lbl {
  font-size: 0.68rem;
  font-weight: 600;
  color: #78716C;
  margin-top: 4px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

/* Floating dark badge */
.hl-hero-float-badge {
  position: absolute;
  bottom: 10%;
  right: -12%;
  background: #1C1917;
  color: #fff;
  border-radius: 14px;
  padding: 10px 14px 10px 12px;
  font-size: 0.78rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 18px 36px rgba(28,25,23,0.32);
  z-index: 3;
  animation: hlFloatB 7s ease-in-out infinite;
  white-space: nowrap;
}
.hl-hero-float-badge-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: #4ADE80;
  box-shadow: 0 0 0 4px rgba(74,222,128,0.22);
  flex-shrink: 0;
}

/* Decorative back card (depth layer) */
.hl-hero-back-card {
  position: absolute;
  inset: 0;
  border-radius: 28px;
  background: linear-gradient(135deg, #FFE0EE 0%, #FFB8E4 100%);
  transform: rotate(4deg) translate(20px, 20px);
  z-index: 1;
  box-shadow: 0 20px 50px rgba(214,59,138,0.18);
}

/* Pink ribbon decorative element */
.hl-hero-ribbon-deco {
  position: absolute;
  top: -8%;
  right: -8%;
  width: 100px;
  height: 100px;
  background: #1C1917;
  border-radius: 22px;
  transform: rotate(15deg);
  z-index: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 38px;
  box-shadow: 0 16px 32px rgba(28,25,23,0.28);
  animation: hlShapeFloat 8s ease-in-out infinite reverse;
}

@keyframes hlFloatA {
  0%,100% { transform: translateY(0) rotate(-4deg); }
  50%     { transform: translateY(-10px) rotate(-2deg); }
}

@keyframes hlFloatB {
  0%,100% { transform: translateY(0) rotate(3deg); }
  50%     { transform: translateY(-8px) rotate(5deg); }
}

.hl-hero-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.9rem;
  border-radius: 999px;
  background: #FFF0F8;
  border: 1px solid rgba(214,59,138,.2);
  font-size: 0.78rem;
  font-weight: 600;
  color: #B52B72;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  width: fit-content;
}

.hl-hero-pill-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #D63B8A;
}

.hl-hero-h1 {
  font-family: 'DM Serif Display', 'Outfit', Georgia, serif;
  font-size: clamp(2.8rem, 5.5vw, 4.5rem);
  font-weight: 400;
  line-height: 1.08;
  color: #1C1917;
  letter-spacing: -0.02em;
  margin: 0;
}

.hl-hero-h1 em {
  font-style: italic;
  color: #D63B8A;
}

.hl-hero-copy {
  font-size: clamp(1rem, 1.6vw, 1.1rem);
  line-height: 1.7;
  color: #78716C;
  max-width: 440px;
  margin: 0;
}

.hl-hero-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.hl-btn-hero-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.75rem 1.6rem;
  border-radius: 12px;
  font-size: 0.95rem;
  font-weight: 600;
  color: #fff;
  background: #D63B8A;
  border: none;
  transition: all 0.22s ease;
  box-shadow: 0 4px 16px rgba(214,59,138,.30);
}

.hl-btn-hero-primary:hover {
  background: #B52B72;
  box-shadow: 0 6px 22px rgba(214,59,138,.40);
  transform: translateY(-2px);
}

.hl-btn-hero-ghost {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.75rem 1.6rem;
  border-radius: 12px;
  font-size: 0.95rem;
  font-weight: 600;
  color: #44403C;
  background: transparent;
  border: 1.5px solid #D6D3CD;
  transition: all 0.22s ease;
}

.hl-btn-hero-ghost:hover {
  border-color: #D63B8A;
  color: #D63B8A;
  background: #FFF0F8;
}

/* Hero visual */
.hl-hero-visual {
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}

.hl-hero-img-wrap {
  position: relative;
  width: clamp(260px, 45vw, 680px);
  aspect-ratio: 1/1;
}

.hl-hero-img-main {
  width: 100%;
  height: 100%;
  display: block;
}

.hl-hero-img-card {
  position: absolute;
  bottom: -24px;
  left: -28px;
  background: #fff;
  border-radius: 16px;
  padding: 16px 20px;
  box-shadow: 0 8px 28px rgba(28,25,23,.12);
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 160px;
}

.hl-hero-img-card-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: #A8A29E;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.hl-hero-img-card-value {
  font-family: 'Outfit', sans-serif;
  font-size: 1.6rem;
  font-weight: 700;
  color: #D63B8A;
  line-height: 1;
}

.hl-hero-img-card-sub {
  font-size: 0.75rem;
  color: #78716C;
  font-weight: 500;
}

/* ── Stats strip ── */
.hl-stats-strip {
  background: #fff;
  border-top: 1px solid #EEEDE8;
  border-bottom: 1px solid #EEEDE8;
}

.hl-stats-inner {
  max-width: 1320px;
  margin: 0 auto;
  padding: clamp(24px,3vw,36px) clamp(20px,4vw,56px);
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
}

.hl-stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  text-align: center;
  padding: 0 1rem;
  border-right: 1px solid #EEEDE8;
}

.hl-stat-item:last-child { border-right: none; }

.hl-stat-num {
  font-family: 'Outfit', sans-serif;
  font-size: clamp(1.8rem, 3vw, 2.5rem);
  font-weight: 700;
  color: #D63B8A;
  line-height: 1;
  letter-spacing: -0.02em;
}

.hl-stat-label {
  font-size: 0.82rem;
  font-weight: 500;
  color: #78716C;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* ═══════════════════════════════════════════════════════
   SECTION BASE
═══════════════════════════════════════════════════════ */
.hl-section {
  padding: clamp(56px,7vw,96px) clamp(20px,4vw,56px);
}

.hl-section-inner {
  max-width: 1320px;
  margin: 0 auto;
}

.hl-section-label {
  font-size: 0.72rem;
  font-weight: 700;
  color: #D63B8A;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 0.75rem;
}

.hl-section-h2 {
  font-family: 'DM Serif Display', 'Outfit', Georgia, serif;
  font-size: clamp(1.8rem, 3.5vw, 2.8rem);
  font-weight: 400;
  color: #1C1917;
  letter-spacing: -0.02em;
  margin: 0 0 0.75rem;
  line-height: 1.15;
}

.hl-section-sub {
  font-size: 1rem;
  color: #78716C;
  line-height: 1.65;
  max-width: 540px;
  margin: 0;
}

/* ═══════════════════════════════════════════════════════
   HOW IT WORKS
═══════════════════════════════════════════════════════ */
.hl-how {
  background: #FAFAF9;
}

.hl-how-head {
  margin-bottom: clamp(2rem,4vw,3.5rem);
}

.hl-how-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.25rem;
}

.hl-how-card {
  background: #fff;
  border: 1px solid #EEEDE8;
  border-radius: 20px;
  padding: clamp(1.5rem,3vw,2.25rem);
  box-shadow: 0 2px 8px rgba(28,25,23,.05);
  transition: box-shadow 0.22s ease, transform 0.22s ease;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.hl-how-card:hover {
  box-shadow: 0 8px 28px rgba(28,25,23,.10);
  transform: translateY(-3px);
}

.hl-how-num {
  font-family: 'Outfit', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  color: #D63B8A;
  background: #FFF0F8;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  letter-spacing: 0.05em;
}

.hl-how-title {
  font-family: 'Outfit', sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
  color: #1C1917;
  letter-spacing: -0.01em;
  margin: 0;
}

.hl-how-body {
  font-size: 0.9rem;
  color: #78716C;
  line-height: 1.65;
  margin: 0;
  flex: 1;
}

.hl-how-link {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #D63B8A;
  margin-top: auto;
  transition: gap 0.18s ease;
}

.hl-how-link:hover { gap: 0.5rem; }

/* ═══════════════════════════════════════════════════════
   EVENT COUNTDOWN
═══════════════════════════════════════════════════════ */
.hl-event {
  background: #292524;
  color: #fff;
}

.hl-event-inner {
  max-width: 1320px;
  margin: 0 auto;
  padding: clamp(40px,5vw,64px) clamp(20px,4vw,56px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 2rem;
}

.hl-event-info { display: flex; flex-direction: column; gap: 0.5rem; }

.hl-event-badge {
  font-size: 0.72rem;
  font-weight: 700;
  color: #E880BC;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.hl-event-title {
  font-family: 'DM Serif Display', Georgia, serif;
  font-size: clamp(1.4rem, 2.8vw, 2rem);
  font-weight: 400;
  color: #fff;
  margin: 0;
  letter-spacing: -0.01em;
}

.hl-event-date {
  font-size: 0.85rem;
  color: #A8A29E;
}

.hl-event-countdown {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.hl-count-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.hl-count-box {
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 10px;
  width: 60px;
  height: 58px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Outfit', sans-serif;
  font-size: 1.5rem;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.02em;
}

.hl-count-label {
  font-size: 0.62rem;
  font-weight: 600;
  color: #A8A29E;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.hl-count-sep {
  font-size: 1.3rem;
  color: #57534E;
  font-weight: 700;
  margin-bottom: 18px;
}

.hl-event-cta {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.7rem 1.5rem;
  border-radius: 12px;
  background: #D63B8A;
  color: #fff;
  font-weight: 600;
  font-size: 0.9rem;
  border: none;
  transition: all 0.2s ease;
  white-space: nowrap;
  box-shadow: 0 4px 16px rgba(214,59,138,.3);
}

.hl-event-cta:hover {
  background: #B52B72;
  transform: translateY(-2px);
  box-shadow: 0 6px 22px rgba(214,59,138,.4);
}

/* ═══════════════════════════════════════════════════════
   UPCOMING EVENTS — FEATURED + SECONDARY LAYOUT
═══════════════════════════════════════════════════════ */
.hl-upcoming-wrap {
  max-width: 1320px;
  margin: 0 auto;
  padding: clamp(40px,5vw,64px) clamp(20px,4vw,56px);
}

.hl-no-events {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem 0;
  text-align: center;
}

.hl-no-events-msg {
  color: #A8A29E;
  font-size: 1rem;
}

.hl-upcoming-grid {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 2.5rem;
  align-items: start;
}

@media (max-width: 1024px) {
  .hl-upcoming-grid {
    grid-template-columns: 1fr;
  }
}

/* Featured event */
.hl-featured-event {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.hl-featured-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 0.25rem;
}

.hl-featured-meta-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.82rem;
  color: #D4CAC6;
  font-weight: 500;
}

.hl-featured-meta-item svg {
  color: #E880BC;
  flex-shrink: 0;
}

.hl-featured-desc {
  font-size: 0.88rem;
  color: #A8A29E;
  line-height: 1.65;
  max-width: 520px;
  margin-top: 0.25rem;
}

/* Secondary events panel */
.hl-secondary-events {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 18px;
  padding: 1.5rem;
}

.hl-secondary-heading {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #E880BC;
  margin: 0 0 1.1rem;
}

.hl-secondary-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.hl-secondary-card {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  transition: background 0.2s ease;
}

.hl-secondary-card:hover {
  background: rgba(255,255,255,0.08);
}

.hl-secondary-card-date {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #D63B8A;
  border-radius: 10px;
  padding: 0.4rem 0.65rem;
  min-width: 44px;
  flex-shrink: 0;
}

.hl-secondary-month {
  font-size: 0.58rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: #ffd6ee;
  line-height: 1;
}

.hl-secondary-day {
  font-size: 1.3rem;
  font-weight: 800;
  color: #fff;
  line-height: 1.1;
}

.hl-secondary-card-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.hl-secondary-card-title {
  font-size: 0.88rem;
  font-weight: 700;
  color: #fff;
  margin: 0;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hl-secondary-card-loc {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.74rem;
  color: #A8A29E;
}

.hl-secondary-card-loc svg {
  color: #E880BC;
  flex-shrink: 0;
}

.hl-secondary-card-date-str {
  font-size: 0.72rem;
  color: #78716C;
}

/* ═══════════════════════════════════════════════════════
   PAST EVENTS
   ═══════════════════════════════════════════════════════ */
.hl-past-events {
  background: #ffffff;
}

.hl-events-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-top: 32px;
}

@media (max-width: 1024px) {
  .hl-events-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .hl-events-grid {
    grid-template-columns: 1fr;
  }
}

.hl-event-card {
  background: #ffffff;
  border: 1px solid #EEEDE8;
  border-radius: 20px;
  overflow: hidden;
  transition: transform 0.22s ease, box-shadow 0.22s ease;
  box-shadow: 0 4px 20px rgba(28,25,23,.02);
  display: flex;
  flex-direction: column;
}

.hl-event-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(28,25,23,.05);
}

.hl-event-img-wrap {
  position: relative;
  padding-top: 60%;
  overflow: hidden;
  background: #F5F5F0;
}

.hl-event-img-wrap img {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  object-fit: cover;
}

.hl-event-date {
  position: absolute;
  bottom: 12px;
  right: 12px;
  background: rgba(250,250,249,0.92);
  backdrop-filter: blur(4px);
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  color: #D63B8A;
}

.hl-event-info {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
}

.hl-event-info h3 {
  font-family: 'Outfit', sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
  color: #1C1917;
  margin: 0;
}

.hl-event-info p {
  font-size: 0.85rem;
  color: #57534E;
  line-height: 1.5;
  margin: 0;
}

/* ═══════════════════════════════════════════════════════
   ABOUT
   ═══════════════════════════════════════════════════════ */
.hl-about {
  background: #fff;
}

.hl-about-inner {
  max-width: 1320px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
  gap: clamp(40px,6vw,80px);
}

.hl-about-img-wrap {
  position: relative;
  overflow: hidden;
  border-radius: 24px;
  aspect-ratio: 5/4;
  box-shadow: 0 16px 48px rgba(28,25,23,.12);
}

.hl-slider-track {
  display: flex;
  width: 200%;
  height: 100%;
  transition: transform 0.7s cubic-bezier(0.4, 0, 0.2, 1);
}

.hl-slider-track img {
  width: 50%;
  height: 100%;
  object-fit: cover;
  flex-shrink: 0;
}

.hl-about-text { display: flex; flex-direction: column; gap: 1.25rem; }

.hl-about-text h2 {
  font-family: 'DM Serif Display', Georgia, serif;
  font-size: clamp(1.8rem, 3vw, 2.6rem);
  font-weight: 400;
  color: #1C1917;
  letter-spacing: -0.02em;
  margin: 0;
  line-height: 1.15;
}

.hl-about-text p {
  font-size: 1rem;
  line-height: 1.75;
  color: #57534E;
  margin: 0;
}

.hl-about-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: #FFF0F8;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
  color: #B52B72;
}

/* ═══════════════════════════════════════════════════════
   PARTNERS
═══════════════════════════════════════════════════════ */
.hl-partners {
  background: #F5F5F0;
  padding: 5rem 0;
}

.hl-partners-head {
  text-align: center;
  margin-bottom: 3rem;
}

.hl-partners-carousel {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  max-width: 1100px;
  margin: 0 auto;
  position: relative;
}

.hl-partners-card {
  flex: 1;
  background: #ffffff;
  border: 1px solid #EEEDE8;
  border-radius: 24px;
  box-shadow: 0 10px 30px rgba(28, 25, 23, 0.03);
  overflow: hidden;
  height: 420px;
  position: relative;
}

.hl-partners-track {
  display: flex;
  width: 200%;
  height: 100%;
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.hl-partners-slide {
  width: 50%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem 2rem;
  flex-shrink: 0;
}

.hl-partners-slide img {
  max-height: 360px;
  max-width: 92%;
  object-fit: contain;
  filter: grayscale(5%);
  transition: all 0.3s ease;
}

.hl-partners-slide img:hover {
  transform: scale(1.02);
}

.hl-partners-arrow {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #ffffff;
  border: 1px solid #EEEDE8;
  color: #D63B8A;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0,0,0,0.04);
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.hl-partners-arrow:hover {
  background: #FFF0F8;
  border-color: #FFDDF0;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(214, 59, 138, 0.1);
}

.hl-partners-arrow:active {
  transform: translateY(0);
}

.hl-partners-dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 1.5rem;
}

.hl-partners-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #E5E5E0;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0;
}

.hl-partners-dot.active {
  background: #D63B8A;
  width: 20px;
  border-radius: 4px;
}

@media (max-width: 650px) {
  .hl-partners-carousel {
    gap: 0.5rem;
  }
  .hl-partners-card {
    height: 300px;
  }
  .hl-partners-slide {
    padding: 1rem 1rem;
  }
  .hl-partners-slide img {
    max-height: 240px;
    max-width: 95%;
  }
  .hl-partners-arrow {
    width: 38px;
    height: 38px;
    font-size: 1.2rem;
  }
}

/* ═══════════════════════════════════════════════════════
   CONTACT
═══════════════════════════════════════════════════════ */
.hl-contact {
  background: #FAFAF9;
}

.hl-contact-inner {
  max-width: 1320px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  align-items: start;
  gap: clamp(40px,6vw,80px);
}

.hl-contact-info { display: flex; flex-direction: column; gap: 1.25rem; }

.hl-contact-info h2 {
  font-family: 'DM Serif Display', Georgia, serif;
  font-size: clamp(1.6rem,3vw,2.4rem);
  font-weight: 400;
  color: #1C1917;
  letter-spacing: -0.02em;
  margin: 0;
  line-height: 1.18;
}

.hl-contact-info p {
  font-size: 1rem;
  line-height: 1.65;
  color: #78716C;
  margin: 0;
}

.hl-contact-card {
  background: #fff;
  border: 1px solid #EEEDE8;
  border-radius: 20px;
  padding: clamp(1.5rem,3vw,2.25rem);
  box-shadow: 0 4px 16px rgba(28,25,23,.06);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.hl-form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.hl-form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.hl-form-group label {
  font-size: 0.78rem;
  font-weight: 600;
  color: #57534E;
  letter-spacing: 0.01em;
}

.hl-form-group input,
.hl-form-group textarea {
  width: 100%;
  padding: 0.65rem 0.9rem;
  border: 1.5px solid #EEEDE8;
  border-radius: 10px;
  background: #FAFAF9;
  font-size: 0.9rem;
  color: #1C1917;
  font-family: 'Inter', sans-serif;
  transition: all 0.18s ease;
  outline: none;
}

.hl-form-group input::placeholder,
.hl-form-group textarea::placeholder { color: #A8A29E; }

.hl-form-group input:focus,
.hl-form-group textarea:focus {
  border-color: #D63B8A;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(214,59,138,.12);
}

.hl-form-group textarea { resize: vertical; min-height: 110px; }

.hl-form-submit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  background: #D63B8A;
  color: #fff;
  font-size: 0.9rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 14px rgba(214,59,138,.28);
}

.hl-form-submit:hover:not(:disabled) {
  background: #B52B72;
  box-shadow: 0 6px 20px rgba(214,59,138,.38);
  transform: translateY(-1px);
}

.hl-form-submit:disabled { opacity: 0.65; cursor: not-allowed; }

/* ═══════════════════════════════════════════════════════
   FOOTER
═══════════════════════════════════════════════════════ */
.hl-footer {
  background: #1C1917;
  color: #fff;
}

.hl-footer-inner {
  max-width: 1320px;
  margin: 0 auto;
  padding: clamp(48px,6vw,72px) clamp(20px,4vw,56px) clamp(24px,3vw,36px);
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr;
  gap: clamp(2rem,4vw,4rem);
}

.hl-footer-brand { display: flex; flex-direction: column; gap: 0.75rem; }

.hl-footer-logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: 'Outfit', sans-serif;
  font-weight: 700;
  font-size: 1rem;
  color: #fff;
}

.hl-footer-logo img {
  width: 32px;
  height: 32px;
  object-fit: contain;
}

.hl-footer-tagline {
  font-size: 0.85rem;
  line-height: 1.65;
  color: #78716C;
  max-width: 280px;
}

.hl-footer-col h4 {
  font-family: 'Outfit', sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  color: #A8A29E;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin: 0 0 1rem;
}

.hl-footer-col ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.hl-footer-col ul li a {
  font-size: 0.85rem;
  color: #78716C;
  transition: color 0.15s;
}

.hl-footer-col ul li a:hover { color: #E880BC; }

.hl-footer-address {
  font-size: 0.82rem;
  line-height: 1.65;
  color: #78716C;
  white-space: pre-line;
}

.hl-footer-bottom {
  max-width: 1320px;
  margin: 0 auto;
  padding: 1.25rem clamp(20px,4vw,56px);
  border-top: 1px solid rgba(255,255,255,.07);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.hl-footer-copy {
  font-size: 0.78rem;
  color: #57534E;
}

/* ── Subscribe ── */
.hl-subscribe {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.hl-subscribe input {
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 8px;
  padding: 0.5rem 0.85rem;
  font-size: 0.82rem;
  color: #fff;
  outline: none;
  width: 200px;
  transition: border-color 0.15s;
}

.hl-subscribe input::placeholder { color: #57534E; }
.hl-subscribe input:focus { border-color: rgba(214,59,138,.5); }

.hl-subscribe button {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  background: #D63B8A;
  color: #fff;
  font-size: 0.82rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: background 0.2s;
}

.hl-subscribe button:hover { background: #B52B72; }

/* ═══════════════════════════════════════════════════════
   RESPONSIVE
═══════════════════════════════════════════════════════ */
@media (max-width: 1100px) {
  .hl-hero-inner { grid-template-columns: 1fr; text-align: center; }
  .hl-hero-text { align-items: center; max-width: 600px; margin: 0 auto; }
  .hl-hero-pill, .hl-hero-copy { text-align: center; }
  .hl-hero-copy { max-width: 520px; }
  .hl-hero-trust { justify-content: center; }
  .hl-hero-visual { display: none; }
  .hl-shape-1, .hl-shape-2, .hl-shape-3 { display: none; }
  .hl-about-inner { grid-template-columns: 1fr; }
  .hl-contact-inner { grid-template-columns: 1fr; }
  .hl-footer-inner { grid-template-columns: 1fr 1fr; }
}

@media (max-width: 800px) {
  .hl-nav-links { display: none; }
  .hl-burger { display: flex; }
  .hl-how-grid { grid-template-columns: 1fr; }
  .hl-stats-inner { grid-template-columns: 1fr; gap: 1rem; }
  .hl-stat-item { border-right: none; border-bottom: 1px solid #EEEDE8; padding-bottom: 1rem; }
  .hl-stat-item:last-child { border-bottom: none; }
  .hl-event-inner { flex-direction: column; align-items: flex-start; }
  .hl-event-countdown { flex-wrap: wrap; }
  .hl-count-box { width: 50px; height: 48px; font-size: 1.25rem; }
  .hl-form-row { grid-template-columns: 1fr; }
  .hl-footer-inner { grid-template-columns: 1fr; }
}

@media (max-width: 480px) {
  .hl-hero-h1 { font-size: 2.2rem; }
  .hl-hero-actions { flex-direction: column; align-items: stretch; }
  .hl-btn-hero-primary, .hl-btn-hero-ghost { justify-content: center; }
  .hl-about-img-wrap { border-radius: 16px; }
}

@media (prefers-reduced-motion: reduce) {
  .hl-how-card, .hl-btn-hero-primary, .hl-btn-primary { transition: none !important; transform: none !important; }
}
`;

/* ─────────────────────────────────────────────
   3D Pink Hair Strand Illustration (SVG)
───────────────────────────────────────────── */
export const HairStrand3D: React.FC = () => (
  <svg
    viewBox="0 0 360 450"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ width: '100%', height: '100%', display: 'block', filter: 'drop-shadow(0 28px 52px rgba(214,59,138,0.35))' }}
    aria-label="3D flowing pink hair strand illustration"
  >
    <defs>
      {/* Ambient glow behind strands */}
      <radialGradient id="hg-glow" cx="48%" cy="52%" r="50%">
        <stop offset="0%" stopColor="#E04FA0" stopOpacity="0.22"/>
        <stop offset="70%" stopColor="#D63B8A" stopOpacity="0.05"/>
        <stop offset="100%" stopColor="#D63B8A" stopOpacity="0"/>
      </radialGradient>
      {/* Root-to-tip gradient — darkens at root and tip, bright in middle */}
      <linearGradient id="hg-v1" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="#3A0618"/>
        <stop offset="25%"  stopColor="#7A1640"/>
        <stop offset="55%"  stopColor="#8B1A4A"/>
        <stop offset="80%"  stopColor="#6B1230"/>
        <stop offset="100%" stopColor="#3A0618"/>
      </linearGradient>
      <linearGradient id="hg-v2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="#4A0E28"/>
        <stop offset="25%"  stopColor="#9E2358"/>
        <stop offset="55%"  stopColor="#B52B68"/>
        <stop offset="80%"  stopColor="#8B1A46"/>
        <stop offset="100%" stopColor="#4A0E28"/>
      </linearGradient>
      <linearGradient id="hg-v3" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="#5B1230"/>
        <stop offset="25%"  stopColor="#C03278"/>
        <stop offset="55%"  stopColor="#CF3A88"/>
        <stop offset="80%"  stopColor="#9E2260"/>
        <stop offset="100%" stopColor="#5B1230"/>
      </linearGradient>
      <linearGradient id="hg-v4" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="#6B1638"/>
        <stop offset="25%"  stopColor="#D03A84"/>
        <stop offset="55%"  stopColor="#E04A96"/>
        <stop offset="80%"  stopColor="#B82870"/>
        <stop offset="100%" stopColor="#6B1638"/>
      </linearGradient>
      <linearGradient id="hg-v5" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="#781840"/>
        <stop offset="20%"  stopColor="#DA3E8C"/>
        <stop offset="50%"  stopColor="#EC52A4"/>
        <stop offset="80%"  stopColor="#C8307A"/>
        <stop offset="100%" stopColor="#781840"/>
      </linearGradient>
      <linearGradient id="hg-v6" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="#841A44"/>
        <stop offset="20%"  stopColor="#E448A0"/>
        <stop offset="50%"  stopColor="#F866B8"/>
        <stop offset="80%"  stopColor="#D03C8E"/>
        <stop offset="100%" stopColor="#841A44"/>
      </linearGradient>
      <linearGradient id="hg-hi1" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="#FFB8E4" stopOpacity="0.9"/>
        <stop offset="50%"  stopColor="#FFD0EE" stopOpacity="0.8"/>
        <stop offset="100%" stopColor="#FFB8E4" stopOpacity="0.6"/>
      </linearGradient>
      <linearGradient id="hg-hi2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="white" stopOpacity="0.6"/>
        <stop offset="50%"  stopColor="white" stopOpacity="0.4"/>
        <stop offset="100%" stopColor="white" stopOpacity="0.3"/>
      </linearGradient>
    </defs>

    {/* ── Ambient glow ── */}
    <ellipse cx="178" cy="225" rx="145" ry="195" fill="url(#hg-glow)"/>

    {/* ── SHADOW — dark blurred copy behind all strands ── */}
    <g transform="translate(14,18)" opacity="0.3" style={{filter:'blur(8px)'}}>
      <path d="M 80,0 C 58,85 30,165 36,248 C 42,322 68,405 90,448" stroke="#260610" strokeWidth="22" strokeLinecap="round"/>
      <path d="M 175,0 C 153,85 125,165 131,248 C 137,322 163,405 185,448" stroke="#260610" strokeWidth="14" strokeLinecap="round"/>
      <path d="M 270,0 C 248,85 220,165 226,248 C 232,322 258,405 280,448" stroke="#260610" strokeWidth="22" strokeLinecap="round"/>
    </g>

    {/* ── BACK STRANDS (darkest, widest) ── */}
    <path d="M 80,0 C 58,85 30,165 36,248 C 42,322 68,405 90,448"  stroke="url(#hg-v1)" strokeWidth="20" strokeLinecap="round"/>
    <path d="M 272,0 C 250,85 222,165 228,248 C 234,322 260,405 282,448" stroke="url(#hg-v1)" strokeWidth="20" strokeLinecap="round"/>

    {/* ── SECOND LAYER ── */}
    <path d="M 100,0 C 78,85 50,165 56,248 C 62,322 88,405 110,448"  stroke="url(#hg-v2)" strokeWidth="17" strokeLinecap="round"/>
    <path d="M 252,0 C 230,85 202,165 208,248 C 214,322 240,405 262,448" stroke="url(#hg-v2)" strokeWidth="17" strokeLinecap="round"/>

    {/* ── THIRD LAYER ── */}
    <path d="M 120,0 C 98,85 70,165 76,248 C 82,322 108,405 130,448"  stroke="url(#hg-v3)" strokeWidth="15" strokeLinecap="round"/>
    <path d="M 232,0 C 210,85 182,165 188,248 C 194,322 220,405 242,448" stroke="url(#hg-v3)" strokeWidth="15" strokeLinecap="round"/>

    {/* ── FOURTH LAYER ── */}
    <path d="M 140,0 C 118,85 90,165 96,248 C 102,322 128,405 150,448"  stroke="url(#hg-v4)" strokeWidth="13" strokeLinecap="round"/>
    <path d="M 212,0 C 190,85 162,165 168,248 C 174,322 200,405 222,448" stroke="url(#hg-v4)" strokeWidth="13" strokeLinecap="round"/>

    {/* ── CENTER STRANDS (brightest, catching light) ── */}
    <path d="M 158,0 C 136,85 108,165 114,248 C 120,322 146,405 168,448"  stroke="url(#hg-v5)" strokeWidth="12" strokeLinecap="round"/>
    <path d="M 194,0 C 172,85 144,165 150,248 C 156,322 182,405 204,448"  stroke="url(#hg-v5)" strokeWidth="12" strokeLinecap="round"/>

    {/* ── HIGHLIGHT CENTER ── */}
    <path d="M 176,0 C 154,85 126,165 132,248 C 138,322 164,405 186,448"  stroke="url(#hg-v6)" strokeWidth="11" strokeLinecap="round"/>

    {/* ── THIN HIGHLIGHT STRANDS (shimmer / specular) ── */}
    <path d="M 170,0 C 148,85 120,165 126,248 C 132,322 158,405 180,448"
      stroke="url(#hg-hi1)" strokeWidth="4" strokeLinecap="round" opacity="0.85"/>
    <path d="M 183,0 C 161,85 133,165 139,248 C 145,322 171,405 193,448"
      stroke="url(#hg-hi2)" strokeWidth="2.5" strokeLinecap="round" opacity="0.6"/>

    {/* ── FINE ROOT DETAIL — subtle dark lines near top ── */}
    <line x1="90" y1="0" x2="75" y2="60"  stroke="#1A0410" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
    <line x1="130" y1="0" x2="112" y2="60" stroke="#1A0410" strokeWidth="1" strokeLinecap="round" opacity="0.3"/>
    <line x1="175" y1="0" x2="158" y2="60" stroke="#1A0410" strokeWidth="1" strokeLinecap="round" opacity="0.3"/>
    <line x1="220" y1="0" x2="202" y2="60" stroke="#1A0410" strokeWidth="1" strokeLinecap="round" opacity="0.3"/>
    <line x1="262" y1="0" x2="245" y2="60" stroke="#1A0410" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
  </svg>
);

const LandingPage: React.FC = () => {
  const [partnershipData, setPartnershipData] = useState({
    full_name: '', email: '', phone: '', organization: '', message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cms, setCms] = useState<any>(null);
  const [aboutIndex, setAboutIndex] = useState(0);
  const [partnerIndex, setPartnerIndex] = useState(0);
  const [nextEvent, setNextEvent] = useState<any>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [menuOpen, setMenuOpen] = useState(false);

  // Paint warm body background while on this page
  useEffect(() => {
    const prev = document.body.style.background;
    document.body.style.background = '#FAFAF9';
    document.documentElement.style.background = '#FAFAF9';
    return () => {
      document.body.style.background = prev;
      document.documentElement.style.background = '';
    };
  }, []);

  useEffect(() => {
    apiClient.get('/api/public/site-settings').then(r => setCms(r.data)).catch(() => {});
    apiClient.get('/api/public/events/upcoming').then(r => {
      const events: any[] = Array.isArray(r.data) ? r.data : [];
      if (events.length > 0) setNextEvent(events[0]);
      setUpcomingEvents(events);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!nextEvent) return;
    const eventDate = new Date(nextEvent.date).getTime();
    const timer = setInterval(() => {
      const dist = eventDate - Date.now();
      if (dist < 0) { clearInterval(timer); setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 }); return; }
      setCountdown({
        days: Math.floor(dist / 86400000),
        hours: Math.floor((dist % 86400000) / 3600000),
        minutes: Math.floor((dist % 3600000) / 60000),
        seconds: Math.floor((dist % 60000) / 1000)
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [nextEvent]);

  useEffect(() => {
    const pInt = setInterval(() => setPartnerIndex(p => (p + 1) % 2), 4000);
    const aInt = setInterval(() => setAboutIndex(p => (p + 1) % 2), 5000);
    return () => { clearInterval(pInt); clearInterval(aInt); };
  }, []);

  const handlePartnershipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient.post('/internal-api/partnerships', partnershipData);
      alert('Thank you! Your partnership inquiry has been received.');
      setPartnershipData({ full_name: '', email: '', phone: '', organization: '', message: '' });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const get = (key: string, field?: string, fallback?: any) => {
    if (!cms || !cms[key]) return fallback;
    if (field) return cms[key][field] ?? fallback;
    return cms[key] ?? fallback;
  };

  const images = cms?.images || {};
  // const stats: any[] = get('stats', undefined, [
  //   { value: '2,500+', label: 'Hair Donations' },
  //   { value: '2,500+', label: 'Wigs Created' }
  // ]);
  const services: any[] = get('services', undefined, [
    { title: 'Donate Hair', description: 'Give the gift of confidence to someone in need by donating your hair.', ctaLabel: 'Donate Hair' },
    { title: 'Request a Wig', description: 'Apply for a free wig with health certification. We\'ll guide you every step.', ctaLabel: 'Request Now' },
    { title: 'Give Monetarily', description: 'Support our mission financially and earn reward points along the way.', ctaLabel: 'Donate Money' }
  ]);

  const serviceLinks = ['/donor/donate', '/recipient/request', '/donate-monetary'];

  const pastEvents: any[] = get('pastEvents', undefined, [
    { title: 'Hair Donation Drive', description: 'Generous donor sharing hope by gifting her locks for wig crafting at Tau Lambda Alpha, Los Baños.', date: 'April 28, 2026', imageKey: 'eventImg1' },
    { title: 'Strand Up for Cancer Campaign', description: 'Community hair donation drive with our lovely volunteers and donors presenting their certificates of appreciation.', date: 'April 28, 2026', imageKey: 'eventImg2' },
    { title: 'Wig Crafting & Haircut Session', description: 'Professional stylists volunteering to cut and measure hair for custom medical-grade wigs.', date: 'Feb 25, 2026', imageKey: 'eventImg3' },
    { title: 'Donation Celebration', description: 'Donors showcasing their ponytails alongside certificates of appreciation for supporting cancer survivors.', date: 'Feb 2, 2026', imageKey: 'eventImg4' }
  ]);

  const featuredEvent = upcomingEvents[0] || null;
  const secondaryEvents = upcomingEvents.slice(1);

  const fmtFeaturedDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const fmtFeaturedTime = (d: string) =>
    new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const fmtSecondaryDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });



  return (
    <div className="hl-root">
      <style>{hlStyles}</style>

      {/* ── NAV ── */}
      <header className="hl-nav" id="home">
        <div className="hl-nav-inner">
          <Link to="/" className="hl-logo">
            <img src="/assets/images/landing/pink-ribbon.png" alt="HairLink ribbon" />
            <span>HairLink</span>
          </Link>
          <nav className="hl-nav-links">
            <a href="#home">Home</a>
            <a href="#services">How It Works</a>
            <a href="#about">About</a>
            <a href="#partners">Partners</a>
            <a href="#contact">Contact</a>
            <div className="hl-nav-divider" />
            <Link to="/login" className="hl-btn-ghost">Login</Link>
            <Link to="/register" className="hl-btn-primary">Register</Link>
          </nav>
          <button className="hl-burger" aria-label="Toggle menu" onClick={() => setMenuOpen(v => !v)}>
            <span /><span /><span />
          </button>
        </div>
        <div className={`hl-drawer ${menuOpen ? 'open' : ''}`}>
          <a href="#home" onClick={() => setMenuOpen(false)}>Home</a>
          <a href="#services" onClick={() => setMenuOpen(false)}>How It Works</a>
          <a href="#about" onClick={() => setMenuOpen(false)}>About</a>
          <a href="#partners" onClick={() => setMenuOpen(false)}>Partners</a>
          <a href="#contact" onClick={() => setMenuOpen(false)}>Contact</a>
          <Link to="/login" onClick={() => setMenuOpen(false)}>Login</Link>
          <Link to="/register" onClick={() => setMenuOpen(false)} style={{ color: '#D63B8A', fontWeight: 600 }}>Register</Link>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="hl-hero">
        {/* Hair image as full-hero background */}
        <div className="hl-hero-bg-hair" />
        {/* Decorative 3D layers */}
        <div className="hl-hero-dots" />
        <div className="hl-hero-orb hl-orb-1" />
        <div className="hl-hero-orb hl-orb-2" />
        <div className="hl-hero-orb hl-orb-3" />
        <div className="hl-hero-shape hl-shape-1" />
        <div className="hl-hero-shape hl-shape-2" />
        <div className="hl-hero-shape hl-shape-3" />

        <div className="hl-hero-inner">
          <div className="hl-hero-text">
            <div className="hl-hero-pill">
              <span className="hl-hero-pill-dot" />
              {get('hero', 'pillText', 'Strand Up for Cancer')}
            </div>
            <h1 className="hl-hero-h1">
              {(() => {
                const val = get('hero', 'heading');
                if (typeof val === 'string') {
                  return <span dangerouslySetInnerHTML={{ __html: val }} />;
                }
                return val || <>Every Strand,<br />a Story of <em>Hope.</em></>;
              })()}
            </h1>
            <p className="hl-hero-copy">
              {get('hero', 'subheading', 'Supporting cancer patients through hair donation, wig crafting, and compassionate community.')}
            </p>
            <div className="hl-hero-actions">
              <Link to="/donor/donate" className="hl-btn-hero-primary">
                {get('hero', 'ctaLabel', 'Donate Your Hair')} →
              </Link>
              <Link to="/recipient/request" className="hl-btn-hero-ghost">
                {get('hero', 'ghostLabel', 'Request a Wig')}
              </Link>
            </div>
          </div>

          {/* ── 3D Visual composition ── */}
          <div className="hl-hero-visual">
            <div className="hl-hero-ribbon-deco">🎀</div>
            <div className="hl-hero-back-card" />
            <div className="hl-hero-card">
              <img
                src="/assets/images/landing/dark_flowing_hair_bg.png"
                alt="Flowing hair representing hope and donation"
              />
            </div>

            <div className="hl-hero-float-badge">
              <span className="hl-hero-float-badge-dot" />
              {get('hero', 'floatBadgeText', '100% Free for Patients')}
            </div>
          </div>
        </div>
      </section>



      {/* ── HOW IT WORKS ── */}
      <section className="hl-section hl-how" id="services">
        <div className="hl-section-inner">
          <div className="hl-how-head">
            <p className="hl-section-label">{get('servicesHeader', 'label', 'How It Works')}</p>
            <h2 className="hl-section-h2" dangerouslySetInnerHTML={{ __html: get('servicesHeader', 'heading', 'Simple steps,<br />lasting impact.') }} />
            <p className="hl-section-sub">{get('servicesHeader', 'subheading', 'Whether you want to donate or receive, we make the process simple and transparent.')}</p>
          </div>
          <div className="hl-how-grid">
            {services.map((svc, i) => (
              <div key={i} className="hl-how-card">
                <h3 className="hl-how-title">{svc.title}</h3>
                <p className="hl-how-body">{svc.description}</p>
                <Link to={serviceLinks[i] || '/donor/donate'} className="hl-how-link">
                  {svc.ctaLabel} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── EVENT COUNTDOWN ── */}
      <section className="hl-event">
        <div className="hl-upcoming-wrap">

          {upcomingEvents.length === 0 ? (
            <div className="hl-no-events">
              <span className="hl-event-badge">Upcoming Events</span>
              <p className="hl-no-events-msg">No upcoming events scheduled at the moment.</p>
            </div>
          ) : (
            <div className="hl-upcoming-grid">

              {/* ── FEATURED EVENT (left / top) ── */}
              {featuredEvent && (
                <div className="hl-featured-event">
                  <span className="hl-event-badge">
                    ★ Featured Upcoming Event
                  </span>
                  <h2 className="hl-event-title">{featuredEvent.title}</h2>

                  <div className="hl-featured-meta">
                    <span className="hl-featured-meta-item">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      {fmtFeaturedDate(featuredEvent.date)}
                    </span>
                    <span className="hl-featured-meta-item">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      {fmtFeaturedTime(featuredEvent.date)}
                    </span>
                    {featuredEvent.location && (
                      <span className="hl-featured-meta-item">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        {featuredEvent.location}
                      </span>
                    )}
                  </div>

                  {featuredEvent.description && (
                    <p className="hl-featured-desc">{featuredEvent.description}</p>
                  )}

                  {/* Countdown */}
                  <div className="hl-event-countdown" style={{ marginTop: '1.5rem' }}>
                    {(['days', 'hours', 'minutes', 'seconds'] as const).map((unit, idx) => (
                      <React.Fragment key={unit}>
                        <div className="hl-count-item">
                          <div className="hl-count-box">
                            {String((countdown as any)[unit]).padStart(2, '0')}
                          </div>
                          <span className="hl-count-label">{unit.charAt(0).toUpperCase() + unit.slice(1, 4)}</span>
                        </div>
                        {idx < 3 && <span className="hl-count-sep">:</span>}
                      </React.Fragment>
                    ))}
                  </div>

                  <Link to="/donate-monetary" className="hl-event-cta" style={{ marginTop: '1.75rem', alignSelf: 'flex-start' }}>
                    ♥ Support the Event
                  </Link>
                </div>
              )}

              {/* ── SECONDARY EVENTS (right / below) ── */}
              {secondaryEvents.length > 0 && (
                <div className="hl-secondary-events">
                  <p className="hl-secondary-heading">More Upcoming Events</p>
                  <div className="hl-secondary-list">
                    {secondaryEvents.map((ev: any) => (
                      <div key={ev.id} className="hl-secondary-card">
                        <div className="hl-secondary-card-date">
                          <span className="hl-secondary-month">
                            {new Date(ev.date).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                          </span>
                          <span className="hl-secondary-day">
                            {new Date(ev.date).getDate()}
                          </span>
                        </div>
                        <div className="hl-secondary-card-body">
                          <h4 className="hl-secondary-card-title">{ev.title}</h4>
                          {ev.location && (
                            <span className="hl-secondary-card-loc">
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                              {ev.location}
                            </span>
                          )}
                          <span className="hl-secondary-card-date-str">{fmtSecondaryDate(ev.date)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </section>

      {/* ── PAST EVENTS ── */}
      <section className="hl-section hl-past-events" id="past-events" style={{ background: '#ffffff' }}>
        <div className="hl-section-inner">
          <div className="hl-how-head" style={{ marginBottom: '3rem' }}>
            <p className="hl-section-label">{get('pastEventsHeader', 'label', 'Past Events')}</p>
            <h2 className="hl-section-h2">{get('pastEventsHeader', 'heading', 'Highlighting our community impact.')}</h2>
            <p className="hl-section-sub">{get('pastEventsHeader', 'subheading', 'Take a look back at our past hair donation drives, volunteer campaigns, and charity events.')}</p>
          </div>
          
          <div className="hl-events-grid">
            {pastEvents.map((pe, idx) => (
              <div key={idx} className="hl-event-card">
                <div className="hl-event-img-wrap">
                  <img src={images[pe.imageKey] || `/assets/images/landing/past-event-${idx+1}.jpg`} alt={pe.title} />
                  <span className="hl-event-date">{pe.date}</span>
                </div>
                <div className="hl-event-info">
                  <h3>{pe.title}</h3>
                  <p>{pe.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT ── */}
      <section className="hl-section hl-about" id="about">
        <div className="hl-about-inner">
          <div className="hl-about-img-wrap">
            <div
              className="hl-slider-track"
              style={{ transform: `translateX(-${aboutIndex * 50}%)` }}
            >
              <img src={images.aboutImg1 || '/assets/images/landing/sufc-team.jpg'} alt="SUFC team" />
              <img src={images.aboutImg2 || '/assets/images/landing/sufc-team2.jpg'} alt="SUFC team" />
            </div>
          </div>
          <div className="hl-about-text">
            <span className="hl-about-tag">🎀 Our Mission</span>
            <h2>{get('about', 'heading', 'About Strand Up for Cancer')}</h2>
            <p>
              {get('about', 'body', 'Strand Up for Cancer (SUFC) is a youth-led initiative dedicated to supporting cancer patients through hair donation and wig crafting. We believe every person fighting cancer deserves to feel beautiful and confident.')}
            </p>
            <Link to="/register" className="hl-btn-hero-primary" style={{ width: 'fit-content', marginTop: '0.5rem' }}>
              Join Our Mission →
            </Link>
          </div>
        </div>
      </section>

      {/* ── PARTNERS ── */}
      <section className="hl-section hl-partners" id="partners">
        <div className="hl-section-inner">
          <div className="hl-partners-head">
            <p className="hl-section-label">{get('partnersHeader', 'label', 'Partners')}</p>
            <h2 className="hl-section-h2">{get('partnersHeader', 'heading', 'Organizations that believe in our cause.')}</h2>
          </div>
          <div className="hl-partners-carousel">
            <button 
              className="hl-partners-arrow prev" 
              type="button"
              onClick={() => setPartnerIndex(p => (p - 1 + 2) % 2)}
              aria-label="Previous partner"
            >
              <i className="bx bx-chevron-left"></i>
            </button>
            
            <div className="hl-partners-card">
              <div 
                className="hl-partners-track"
                style={{ transform: `translateX(-${partnerIndex * 50}%)` }}
              >
                <div className="hl-partners-slide">
                  <img src={images.partnerLogo1 || '/assets/images/landing/pgh.png'} alt="Philippine General Hospital" />
                </div>
                <div className="hl-partners-slide">
                  <img src={images.partnerLogo2 || '/assets/images/landing/wigmaker.png'} alt="Partner wigmaker" />
                </div>
              </div>
            </div>

            <button 
              className="hl-partners-arrow next" 
              type="button"
              onClick={() => setPartnerIndex(p => (p + 1) % 2)}
              aria-label="Next partner"
            >
              <i className="bx bx-chevron-right"></i>
            </button>
          </div>

          <div className="hl-partners-dots">
            {[0, 1].map(idx => (
              <button
                key={idx}
                type="button"
                className={`hl-partners-dot ${partnerIndex === idx ? 'active' : ''}`}
                onClick={() => setPartnerIndex(idx)}
                aria-label={`Go to slide ${idx + 1}`}
              ></button>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section className="hl-section hl-contact" id="contact">
        <div className="hl-contact-inner">
          <div className="hl-contact-info">
            <p className="hl-section-label">{get('contactHeader', 'label', 'Partnership')}</p>
            <h2>{get('contactHeader', 'heading', 'Want to partner with us?')}</h2>
            <p>{get('contactHeader', 'subheading', "Let's connect and grow together. We're open to collaborations with hospitals, organizations, and businesses that share our mission.")}</p>
          </div>
          <div className="hl-contact-card">
            <form onSubmit={handlePartnershipSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div className="hl-form-row">
                  <div className="hl-form-group">
                    <label>Full Name</label>
                    <input
                      type="text"
                      placeholder="Maria Santos"
                      value={partnershipData.full_name}
                      onChange={e => setPartnershipData({ ...partnershipData, full_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="hl-form-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      placeholder="maria@example.com"
                      value={partnershipData.email}
                      onChange={e => setPartnershipData({ ...partnershipData, email: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="hl-form-group">
                  <label>Organization / Company</label>
                  <input
                    type="text"
                    placeholder="Philippine General Hospital"
                    value={partnershipData.organization}
                    onChange={e => setPartnershipData({ ...partnershipData, organization: e.target.value })}
                  />
                </div>
                <div className="hl-form-group">
                  <label>Message</label>
                  <textarea
                    placeholder="Tell us about your organization and how you'd like to collaborate…"
                    rows={4}
                    value={partnershipData.message}
                    onChange={e => setPartnershipData({ ...partnershipData, message: e.target.value })}
                    required
                  />
                </div>
                <button type="submit" className="hl-form-submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Sending…' : 'Send Partnership Inquiry →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="hl-footer">
        <div className="hl-footer-inner">
          <div className="hl-footer-brand">
            <div className="hl-footer-logo">
              <img src="/assets/images/landing/pink-ribbon.png" alt="HairLink" />
              <span>HairLink</span>
            </div>
            <p className="hl-footer-tagline">
              {get('footer', 'tagline', 'Empowering cancer patients through hair donation, wig crafting, and community compassion.')}
            </p>
            <div className="hl-subscribe" style={{ marginTop: '0.25rem' }}>
              <input type="email" placeholder="your@email.com" />
              <button type="button">Subscribe</button>
            </div>
          </div>

          <div className="hl-footer-col">
            <h4>Platform</h4>
            <ul>
              <li><a href="#services">How It Works</a></li>
              <li><Link to="/donor/donate">Donate Hair</Link></li>
              <li><Link to="/recipient/request">Request a Wig</Link></li>
              <li><Link to="/donate-monetary">Give Monetarily</Link></li>
            </ul>
          </div>

          <div className="hl-footer-col">
            <h4>Organization</h4>
            <ul>
              <li><a href="#about">About Us</a></li>
              <li><a href="#partners">Partners</a></li>
              <li><a href="#contact">Contact</a></li>
              <li><Link to="/login">Login</Link></li>
            </ul>
            <div style={{ marginTop: '1.5rem' }}>
              <p className="hl-footer-address">
                {get('footer', 'address', 'Manila Downtown YMCA\n945 Sabino Padilla St,\nBinondo, Manila, 1006')}
              </p>
            </div>
          </div>
        </div>

        <div className="hl-footer-bottom">
          <span className="hl-footer-copy">
            © {new Date().getFullYear()} {get('footer', 'orgName', 'Strand Up for Cancer')}. All rights reserved.
          </span>
          <span className="hl-footer-copy">Made with ♥ for cancer patients</span>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
