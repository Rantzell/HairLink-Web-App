import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/client';
import LoadingScreen from '../components/LoadingScreen';

// Scoped dashboard styling to match the landing page theme and the provided mockup layout
const dashStyles = `
/* ROOT OVERRIDES to make dashboard background full-bleed edge-to-edge */
.dash-main {
  width: 100% !important;
  max-width: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
}

.hl-dash-root, .hl-dash-root * {
  box-sizing: border-box;
}
.hl-dash-root a {
  text-decoration: none;
}
.hl-dash-root {
  min-height: calc(100vh - 64px);
  background: #FAFAF9;
  padding: clamp(24px, 4vw, 48px) 24px;
  font-family: 'Inter', sans-serif;
  color: #1C1917;
  position: relative;
  overflow: hidden;
  width: 100%;
}

.hl-dash-bg-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
  z-index: 0;
  pointer-events: none;
  opacity: 0.85;
}
.hl-dash-bg-blob.blob-1 {
  top: 5%;
  left: -150px;
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(255, 143, 204, 0.28) 0%, transparent 85%);
}
.hl-dash-bg-blob.blob-2 {
  bottom: 10%;
  right: -150px;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(214, 59, 138, 0.16) 0%, transparent 85%);
}

.hl-dash-bg-waves {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}
.hl-dash-bg-waves .wave-left {
  position: absolute;
  top: 0; left: 0;
  height: 100%;
  width: clamp(100px, 15vw, 250px);
}
.hl-dash-bg-waves .wave-right {
  position: absolute;
  top: 0; right: 0;
  height: 100%;
  width: clamp(100px, 15vw, 250px);
}

.hl-dash-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
  position: relative;
  z-index: 1;
  width: 100%;
}

/* TOP ROW */
.hl-dash-top-grid {
  display: grid;
  grid-template-columns: 2.1fr 1fr;
  gap: 24px;
}

@media (max-width: 850px) {
  .hl-dash-top-grid {
    grid-template-columns: 1fr;
  }
}

.hl-dash-hero-card {
  background: #ffffff;
  border: 1px solid #EEEDE8;
  border-radius: 24px;
  padding: 32px;
  box-shadow: 0 4px 20px rgba(28, 25, 23, 0.02);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
}

.hl-dash-hero-left {
  flex: 1;
}

.hl-dash-hero-h1 {
  font-family: 'Outfit', sans-serif;
  font-size: clamp(1.8rem, 3vw, 2.3rem);
  font-weight: 700;
  color: #1C1917;
  letter-spacing: -0.02em;
  margin: 0 0 12px;
}

.hl-dash-hero-sub {
  font-size: 0.95rem;
  color: #78716C;
  line-height: 1.5;
  margin: 0;
}

.hl-dash-hero-right {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

@media (max-width: 500px) {
  .hl-dash-hero-card {
    flex-direction: column;
    text-align: center;
    padding: 24px;
  }
}

/* STAR POINTS CARD */
.hl-dash-star-points-card {
  background: #FFF0F8;
  border: 1px solid #FFDDF0;
  border-radius: 24px;
  padding: 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  box-shadow: 0 4px 20px rgba(214, 59, 138, 0.02);
}

.hl-dash-star-points-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.hl-dash-star-points-label {
  font-size: 0.85rem;
  font-weight: 700;
  color: #78716C;
  letter-spacing: 0.02em;
}

.hl-dash-star-points-value {
  font-family: 'Outfit', sans-serif;
  font-size: 3.4rem;
  font-weight: 700;
  color: #D63B8A;
  line-height: 1;
}

.hl-dash-star-points-sub {
  font-size: 0.85rem;
  color: #57534E;
  font-weight: 600;
}

.hl-dash-star-points-right {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* MAIN GRID */
.hl-dash-main-grid {
  display: grid;
  grid-template-columns: 2.1fr 1fr;
  gap: 24px;
}

@media (max-width: 850px) {
  .hl-dash-main-grid {
    grid-template-columns: 1fr;
  }
}

.hl-dash-left-col {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.hl-dash-right-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* CARDS */
.hl-dash-card {
  background: #ffffff;
  border: 1px solid #EEEDE8;
  border-radius: 24px;
  padding: clamp(20px, 3vw, 28px);
  box-shadow: 0 4px 20px rgba(28, 25, 23, 0.02);
}

/* REWARDS PROGRESS */
.hl-dash-rewards-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  gap: 16px;
}

.hl-dash-rewards-title-block {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.hl-dash-rewards-icon-circle {
  width: 48px;
  height: 48px;
  background: #FFF0F8;
  color: #D63B8A;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  flex-shrink: 0;
}

.hl-dash-rewards-title-text {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.hl-dash-rewards-h2 {
  font-family: 'Outfit', sans-serif;
  font-size: 1.2rem;
  font-weight: 700;
  color: #1C1917;
  margin: 0;
}

.hl-dash-rewards-desc {
  font-size: 0.85rem;
  color: #78716C;
  line-height: 1.5;
  margin: 0;
  max-width: 420px;
}

.hl-dash-rewards-pts {
  font-family: 'Outfit', sans-serif;
  font-size: 1.3rem;
  font-weight: 700;
  color: #D63B8A;
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

/* PROGRESS BAR */
/* PROGRESS TRACK */
.hl-dash-progress-wrap {
  position: relative;
  /* vertical space for the milestone stars that sit on top of the track */
  padding: 20px 0 28px;
  margin-bottom: 8px;
}

.hl-dash-progress-track {
  height: 10px;
  background: #EEEDE8;
  border-radius: 999px;
  position: relative;
  overflow: visible;
}

.hl-dash-progress-fill {
  position: absolute;
  top: 0; left: 0; bottom: 0;
  background: linear-gradient(90deg, #e8679a, #D63B8A);
  border-radius: 999px;
  transition: width 0.9s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Glowing tip star — slides along the fill edge */
.hl-dash-progress-star-indicator {
  position: absolute;
  top: 50%;
  /* translate(-50%,-50%) keeps the star centred on the fill edge */
  transform: translate(-50%, -50%);
  width: 30px;
  height: 30px;
  background: #ffffff;
  border: 2px solid #D63B8A;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #D63B8A;
  font-size: 1rem;
  transition: left 0.9s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 0 0 4px rgba(214,59,138,0.15), 0 2px 8px rgba(214,59,138,0.25);
  z-index: 3;
}

/* Milestone stars — each anchored at its exact % position ON the track */
.hl-dash-milestone-star {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  z-index: 2;
  pointer-events: none;
}

.hl-dash-milestone-star .ms-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #ddd;
  border: 2px solid #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.4s, border-color 0.4s;
  font-size: 0.65rem;
  color: transparent;
}

.hl-dash-milestone-star.reached .ms-dot {
  background: #F59E0B;
  border-color: #fff;
  color: #fff;
  box-shadow: 0 0 0 3px rgba(245,158,11,0.18);
}

.hl-dash-milestone-star .ms-label {
  position: absolute;
  bottom: -20px;
  font-size: 0.6rem;
  font-weight: 700;
  color: #bbb;
  white-space: nowrap;
  transition: color 0.4s;
}

.hl-dash-milestone-star.reached .ms-label {
  color: #D63B8A;
}

/* BANNER */
.hl-dash-rewards-banner {
  background: #FFF0F8;
  border: 1px solid #FFDDF0;
  border-radius: 14px;
  padding: 14px 18px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.hl-dash-rewards-banner i {
  color: #D63B8A;
  font-size: 1.3rem;
  flex-shrink: 0;
}

.hl-dash-rewards-banner-text {
  font-size: 0.85rem;
  font-weight: 700;
  color: #D63B8A;
  margin: 0;
}

/* REFERRAL CARD */
.hl-dash-ref-title {
  font-family: 'Outfit', sans-serif;
  font-size: 1.15rem;
  font-weight: 700;
  color: #1C1917;
  margin: 0 0 6px;
}

.hl-dash-ref-desc {
  font-size: 0.85rem;
  color: #78716C;
  margin: 0 0 20px;
}

.hl-dash-ref-form {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.hl-dash-ref-input {
  flex: 1;
  border: 1px solid #EEEDE8;
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 0.9rem;
  outline: none;
  background: #ffffff;
  font-family: 'Inter', sans-serif;
  transition: all 0.2s;
  color: #1C1917;
}

.hl-dash-ref-input:focus {
  border-color: #D63B8A;
  box-shadow: 0 0 0 3px rgba(214, 59, 138, 0.08);
}

.hl-dash-ref-submit-btn {
  background: #D63B8A;
  color: #ffffff;
  border: none;
  border-radius: 12px;
  padding: 12px 24px;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  font-family: 'Outfit', sans-serif;
  white-space: nowrap;
}

.hl-dash-ref-submit-btn:hover:not(:disabled) {
  background: #B52B72;
}

.hl-dash-ref-submit-btn:disabled {
  background: #EEEDE8;
  color: #A8A29E;
  opacity: 1;
  cursor: not-allowed;
}

/* CLAIMABLE ACTIONS */
.hl-dash-claim-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 10px;
}

.hl-dash-claim-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.hl-dash-claim-header-icon {
  width: 32px;
  height: 32px;
  background: #FFF0F8;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #D63B8A;
  font-size: 1.1rem;
}

.hl-dash-claim-header-title {
  font-family: 'Outfit', sans-serif;
  font-size: 1.2rem;
  font-weight: 700;
  color: #1C1917;
  margin: 0;
}

.hl-dash-claim-view-all {
  font-size: 0.85rem;
  font-weight: 700;
  color: #D63B8A;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: opacity 0.2s;
}

.hl-dash-claim-view-all:hover {
  opacity: 0.8;
}

.hl-dash-claim-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

@media (max-width: 600px) {
  .hl-dash-claim-grid {
    grid-template-columns: 1fr;
  }
}

.hl-dash-claim-item-card {
  border-radius: 20px;
  border: 1px solid #EEEDE8;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 4px 15px rgba(28, 25, 23, 0.01);
}

.hl-dash-claim-item-card.hair {
  background: #FFF5FA;
  border-color: #FFDDF0;
}

.hl-dash-claim-item-card.monetary {
  background: #F0FDFA;
  border-color: #CCFBF1;
}

.hl-dash-claim-item-ill {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.hl-dash-claim-item-details {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.hl-dash-claim-item-title {
  font-family: 'Outfit', sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
  color: #1C1917;
  margin: 0 0 4px;
}

.hl-dash-claim-item-desc {
  font-size: 0.8rem;
  color: #78716C;
  line-height: 1.4;
  margin: 0 0 12px;
}

.hl-dash-claim-item-btn {
  background: #D63B8A;
  color: #ffffff;
  border: none;
  border-radius: 10px;
  padding: 8px 16px;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  font-family: 'Outfit', sans-serif;
  width: fit-content;
}

.hl-dash-claim-item-btn:hover {
  background: #B52B72;
}

/* RIGHT COLUMN ACTIONS MENU */
.hl-dash-action-card {
  background: #ffffff;
  border: 1px solid #EEEDE8;
  border-radius: 16px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 10px rgba(28, 25, 23, 0.01);
}

.hl-dash-action-card:hover {
  border-color: #D6D3CD;
  background: #FAFAF9;
  transform: translateY(-1.5px);
}

.hl-dash-action-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.hl-dash-action-icon-wrap {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: #FFF0F8;
  color: #D63B8A;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.hl-dash-action-text {
  font-family: 'Inter', sans-serif;
  font-weight: 600;
  font-size: 0.9rem;
  color: #44403C;
}

.hl-dash-action-arrow {
  color: #A8A29E;
  font-size: 1rem;
}

.hl-dash-donate-money-btn {
  background: transparent;
  color: #D63B8A;
  border: 1.5px solid #D63B8A;
  border-radius: 16px;
  padding: 16px;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  font-family: 'Outfit', sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
}

.hl-dash-donate-money-btn:hover {
  background: #FFF0F8;
}

/* BOTTOM SECTION */
.hl-dash-bottom-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-top: 32px;
}

.hl-dash-bottom-title {
  font-family: 'Outfit', sans-serif;
  font-size: 1.25rem;
  font-weight: 700;
  color: #1C1917;
  margin: 0;
}

.hl-dash-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

@media (max-width: 850px) {
  .hl-dash-stats-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 480px) {
  .hl-dash-stats-grid {
    grid-template-columns: 1fr;
  }
}

.hl-dash-stat-card {
  background: #ffffff;
  border: 1px solid #EEEDE8;
  border-radius: 20px;
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12px;
  box-shadow: 0 4px 15px rgba(28, 25, 23, 0.01);
}

.hl-dash-stat-icon-circle {
  width: 44px;
  height: 44px;
  background: #FFF0F8;
  color: #D63B8A;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
}

.hl-dash-stat-value {
  font-family: 'Outfit', sans-serif;
  font-size: 1.8rem;
  font-weight: 700;
  color: #D63B8A;
  line-height: 1;
}

.hl-dash-stat-label {
  font-size: 0.85rem;
  color: #78716C;
  font-weight: 600;
  margin: 0;
}

.hl-dash-footer-banner {
  background: #FFF0F8;
  border: 1px solid #FFDDF0;
  border-radius: 20px;
  padding: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  box-shadow: 0 4px 15px rgba(214, 59, 138, 0.01);
}

.hl-dash-footer-banner-left {
  color: #D63B8A;
  font-size: 2.2rem;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.hl-dash-footer-banner-right {
  color: #D63B8A;
  font-size: 2.2rem;
  display: flex;
  align-items: center;
  opacity: 0.45;
  flex-shrink: 0;
}

.hl-dash-footer-banner-text {
  font-size: 0.95rem;
  font-weight: 600;
  color: #D63B8A;
  line-height: 1.5;
  margin: 0;
  text-align: center;
  flex: 1;
}

@media (max-width: 550px) {
  .hl-dash-footer-banner {
    flex-direction: column;
    padding: 20px;
  }
  .hl-dash-footer-banner-right {
    display: none;
  }
}
`;

// PREMIUM VECTOR ILLUSTRATIONS
const GirlHuggingHeartSVG = () => (
  <svg width="220" height="180" viewBox="0 0 220 180" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Soft pink circular backdrop */}
    <circle cx="120" cy="90" r="55" fill="#FFF0F8" />
    
    {/* Floating pink leaves/decorations */}
    <path d="M75 90C65 70 58 75 52 82C46 89 54 98 64 96C74 94 75 90 75 90Z" fill="#FFB8D2" opacity="0.6"/>
    <path d="M165 60C175 40 182 45 188 52C194 59 186 68 176 66C166 64 165 60 165 60Z" fill="#FFB8D2" opacity="0.6"/>
    
    {/* Floating hearts */}
    <path d="M175 95C175 95 178 91 182 91C186 91 188 94 188 97C188 101 182 105 175 109C168 105 162 101 162 97C162 94 164 91 168 91C172 91 175 95 175 95Z" fill="#FF65A3" opacity="0.7"/>
    <path d="M65 50C65 50 67.5 46.5 71 46.5C74.5 46.5 76 49 76 52C76 55.5 71 59 65 62.5C59 59 54 55.5 54 52C54 49 55.5 46.5 59 46.5C62.5 46.5 65 50 65 50Z" fill="#FF65A3" opacity="0.7"/>
    
    {/* Woman's body/arms */}
    <path d="M90 145C90 120 102 110 120 110C138 110 150 120 150 145" fill="#FF8FCC" />
    
    {/* Head & Neck */}
    <path d="M120 115V107" stroke="#FFC4A8" strokeWidth="6" strokeLinecap="round" />
    <path d="M120 106C131 106 138 98 138 88C138 78 131 70 120 70C109 70 102 78 102 88C102 98 109 106 120 106Z" fill="#FFC4A8" />
    
    {/* Curly hair behind head */}
    <path d="M102 85C95 85 90 95 92 108C94 120 102 125 106 125" stroke="#292524" strokeWidth="12" strokeLinecap="round" />
    <path d="M138 85C145 85 150 95 148 108C146 120 138 125 134 125" stroke="#292524" strokeWidth="12" strokeLinecap="round" />
    <path d="M120 64C100 64 96 78 96 88C96 90 98 96 100 96C102 96 103 90 105 88C108 85 112 85 120 85C128 85 132 85 135 88C137 90 138 96 140 96C142 96 144 90 144 88C144 78 140 64 120 64Z" fill="#292524" />
    
    {/* Face Details (Eyes closed, smile) */}
    <path d="M112 88C114 90 116 90 118 88" stroke="#1C1917" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <path d="M122 88C124 90 126 90 128 88" stroke="#1C1917" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <path d="M117 95C118.5 97 121.5 97 123 95" stroke="#E05B80" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <ellipse cx="111" cy="91" rx="2.5" ry="1.5" fill="#FFA5C8" opacity="0.6"/>
    <ellipse cx="129" cy="91" rx="2.5" ry="1.5" fill="#FFA5C8" opacity="0.6"/>
    
    {/* Long hair flowing over shoulders */}
    <path d="M100 75C92 75 88 85 88 100C88 115 94 130 100 135C106 140 102 120 102 110" fill="#292524" />
    <path d="M140 75C148 75 152 85 152 100C152 115 146 130 140 135C134 140 138 120 138 110" fill="#292524" />
    
    {/* Heart in hands */}
    <path d="M120 128C120 128 126 118 135 118C144 118 148 125 148 132C148 142 135 152 120 160C105 152 92 142 92 132C92 125 96 118 105 118C114 118 120 128 120 128Z" fill="#D63B8A" />
    
    {/* Arms hugging */}
    <path d="M90 145C95 140 105 132 115 135" stroke="#FFC4A8" strokeWidth="6.5" strokeLinecap="round" />
    <path d="M150 145C145 140 135 132 125 135" stroke="#FFC4A8" strokeWidth="6.5" strokeLinecap="round" />
  </svg>
);

const HairIllustrationSVG = () => (
  <svg width="70" height="70" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="40" cy="40" r="30" fill="#FFE0EE" />
    {/* Flowing hair strands */}
    <path d="M30 20C35 25 32 35 30 45C28 55 35 62 38 65C34 60 32 50 34 40C36 30 42 25 45 20" stroke="#292524" strokeWidth="4" strokeLinecap="round" />
    <path d="M38 22C42 28 40 38 38 48C36 58 42 64 45 67C41 62 39 52 41 42C43 32 48 27 50 22" stroke="#292524" strokeWidth="3" strokeLinecap="round" fill="none" />
    {/* Warm pink heart */}
    <path d="M48 50C48 50 51 47 55 47C59 47 61 50 61 53C61 57 55 61 48 65C41 61 35 57 35 53C35 50 37 47 41 47C45 47 48 50 48 50Z" fill="#D63B8A" />
  </svg>
);

const HandHeartIllustrationSVG = () => (
  <svg width="70" height="70" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="40" cy="40" r="30" fill="#E6FDF9" />
    {/* Hand holding heart */}
    <path d="M25 55C32 55 38 52 44 48C50 44 56 42 62 44C58 47 52 50 46 53C40 56 32 58 25 57" fill="#FFF0F8" stroke="#FFC4A8" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M28 55C35 50 42 48 48 48" stroke="#FFC4A8" strokeWidth="2.5" strokeLinecap="round" />
    {/* Heart floating above hand */}
    <path d="M48 30C48 30 51 27 55 27C59 27 61 30 61 33C61 37 55 41 48 45C41 41 35 37 35 33C35 30 37 27 41 27C45 27 48 30 48 30Z" fill="#D63B8A" />
  </svg>
);

// Premium background waves SVG pattern
const BackgroundWaves = () => (
  <div className="hl-dash-bg-waves" aria-hidden="true">
    <svg className="wave-left" viewBox="0 0 200 1000" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="wave-grad-left" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#D63B8A" stopOpacity="0.04" />
          <stop offset="50%" stopColor="#FF8FCC" stopOpacity="0.02" />
          <stop offset="100%" stopColor="#FFF0F8" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M0 0 C 100 200, 150 400, 80 600 C 30 750, 120 900, 0 1000 Z" fill="url(#wave-grad-left)" />
      <path d="M0 0 C 80 150, 120 350, 60 550 C 20 700, 90 850, 0 1000 Z" stroke="#D63B8A" strokeWidth="1.5" strokeOpacity="0.06" fill="none" />
    </svg>
    <svg className="wave-right" viewBox="0 0 200 1000" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="wave-grad-right" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#D63B8A" stopOpacity="0.04" />
          <stop offset="50%" stopColor="#FF8FCC" stopOpacity="0.02" />
          <stop offset="100%" stopColor="#FFF0F8" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M200 0 C 100 200, 50 400, 120 600 C 170 750, 80 900, 200 1000 Z" fill="url(#wave-grad-right)" />
      <path d="M200 0 C 120 150, 80 350, 140 550 C 180 700, 110 850, 200 1000 Z" stroke="#D63B8A" strokeWidth="1.5" strokeOpacity="0.06" fill="none" />
    </svg>
  </div>
);

const DonorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [milestoneData, setMilestoneData] = useState<{ progress: number; threshold: number; remaining: number } | null>(null);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [milestoneVoucher, setMilestoneVoucher] = useState<any>(null);
  const [referralCode, setReferralCode] = useState('');
  const [referralStatus, setReferralStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const goal = 100;

  const fetchStats = async () => {
    try {
      setError(null);
      const [statsRes, milestoneRes, vouchersRes] = await Promise.all([
        apiClient.get('/internal-api/donations/stats'),
        apiClient.get('/internal-api/rewards/milestone'),
        apiClient.get('/internal-api/rewards/vouchers'),
      ]);
      setStats(statsRes.data);
      setMilestoneData(milestoneRes.data);

      // Check for new active vouchers not yet acknowledged
      const activeVouchers = (vouchersRes.data || []).filter((v: any) => v.status === 'active');
      const newVoucher = activeVouchers.find(
        (v: any) => !localStorage.getItem(`milestoneModal_${v.id}`)
      );
      if (newVoucher) {
        setMilestoneVoucher(newVoucher);
        setShowMilestoneModal(true);
      }
    } catch (err: any) {
      console.error('Failed to fetch stats', err);
      setError(err?.response?.data?.error || err?.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const handleMilestoneConfirm = () => {
    if (milestoneVoucher) {
      localStorage.setItem(`milestoneModal_${milestoneVoucher.id}`, '1');
    }
    setShowMilestoneModal(false);
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) return <LoadingScreen />;
  if (error) return (
    <div style={{ padding: '50px', textAlign: 'center', color: '#D63B8A', fontFamily: 'Inter, sans-serif' }}>
      <h2>Something went wrong</h2>
      <p>{error}</p>
      <p style={{ marginTop: '20px', color: '#666' }}>
        <strong>Developer tip:</strong> This usually means the backend crashed or the database schema is out of sync.<br/>
        Please stop the backend terminal, run <code>npx prisma generate</code>, and restart the backend.
      </p>
    </div>
  );
  if (!stats) return null;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const handleReferralSubmit = async () => {
    if (!referralCode.trim()) return;
    setReferralStatus('submitting');
    try {
      await apiClient.post('/internal-api/referral', { referral_code: referralCode });
      setReferralStatus('success');
      await fetchStats();
      setReferralCode('');
      setReferralStatus('idle');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid referral code');
      setReferralStatus('idle');
    }
  };

  // Use milestoneProgress for star display (resets after claiming) — falls back to totalPoints
  const points = milestoneData?.progress ?? stats.totalPoints ?? 0;
  const hairDonations = stats.breakdown?.hairDonations || 0;
  const referrals = stats.breakdown?.referrals || 0;
  const monetaryAmount = stats.breakdown?.monetaryAmount || 0;

  const percent = Math.min((points / goal) * 100, 100);
  const filledStars = Math.min(Math.floor(points / 10), 10);

  // SVG Circular progress configurations
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <>
    <div className="hl-dash-root">
      <style>{dashStyles}</style>

      {/* Light Background Blob Designs */}
      <div className="hl-dash-bg-blob blob-1" aria-hidden="true"></div>
      <div className="hl-dash-bg-blob blob-2" aria-hidden="true"></div>

      {/* Background wave decorations */}
      <BackgroundWaves />

      <div className="hl-dash-container">
        
        {/* TOP ROW: Greeting Banner & Star Points Circle Card */}
        <section className="hl-dash-top-grid">
          
          {/* Greeting Hero Card */}
          <div className="hl-dash-hero-card">
            <div className="hl-dash-hero-left">
              <h1 className="hl-dash-hero-h1">{getGreeting()}, {user?.firstName || user?.name || 'Donor'}!</h1>
              <p className="hl-dash-hero-sub">
                Your impact snapshots and reward progress are shown below.
              </p>
            </div>
            <div className="hl-dash-hero-right">
              <GirlHuggingHeartSVG />
            </div>
          </div>

          {/* Star Points circular progress card */}
          <div className="hl-dash-star-points-card">
            <div className="hl-dash-star-points-left">
              <span className="hl-dash-star-points-label">Star Points</span>
              <span className="hl-dash-star-points-value">{points}</span>
              <span className="hl-dash-star-points-sub">You're on your way!</span>
            </div>
            <div className="hl-dash-star-points-right">
              <svg width="72" height="72" viewBox="0 0 72 72">
                <circle
                  cx="36"
                  cy="36"
                  r={radius}
                  fill="transparent"
                  stroke="#EEEDE8"
                  strokeWidth="5"
                />
                <circle
                  cx="36"
                  cy="36"
                  r={radius}
                  fill="transparent"
                  stroke="#D63B8A"
                  strokeWidth="5"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  transform="rotate(-90 36 36)"
                />
                <circle
                  cx="36"
                  cy="36"
                  r="21"
                  fill="#ffffff"
                />
                <path
                  d="M36 22 L39.3 30.6 L48.5 31.4 L41.5 37.5 L43.6 46.5 L36 41.7 L28.4 46.5 L30.5 37.5 L23.5 31.4 L32.7 30.6 Z"
                  fill="#F59E0B"
                />
              </svg>
            </div>
          </div>

        </section>

        {/* MAIN COLUMN GRID */}
        <div className="hl-dash-main-grid">
          
          {/* LEFT SECTION */}
          <div className="hl-dash-left-col">

            {/* Rewards Progress card */}
            <section className="hl-dash-card">
              <div className="hl-dash-rewards-header">
                <div className="hl-dash-rewards-title-block">
                  <div className="hl-dash-rewards-icon-circle">
                    <i className="bx bx-gift"></i>
                  </div>
                  <div className="hl-dash-rewards-title-text">
                    <h2 className="hl-dash-rewards-h2">Your Rewards Progress</h2>
                    <p className="hl-dash-rewards-desc">
                      Earn 10 Star Points for every accepted hair donation and 5 Star Points for each successful referral. Reach 100 points to unlock a free wig reward.
                    </p>
                  </div>
                </div>
                <div className="hl-dash-rewards-pts">
                  ★ {points}
                </div>
              </div>

              {/* Progress Bar with pixel-perfect milestone stars ON the track */}
              <div className="hl-dash-progress-wrap" aria-label={`Reward progress: ${points} of ${goal} points`}>
                <div className="hl-dash-progress-track">
                  {/* Fill bar */}
                  <span
                    className="hl-dash-progress-fill"
                    style={{ width: `${percent}%` }}
                  />

                  {/* Milestone dots at 10%, 20%, …, 100% — each is exactly 10 pts apart */}
                  {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((milestone) => {
                    const reached = points >= milestone;
                    return (
                      <span
                        key={milestone}
                        className={`hl-dash-milestone-star${reached ? ' reached' : ''}`}
                        style={{ left: `${milestone}%` }}
                        aria-label={`${milestone} points milestone${reached ? ' reached' : ''}`}
                      >
                        <span className="ms-dot">
                          {reached && <i className="bx bxs-star" />}
                        </span>
                        <span className="ms-label">{milestone}</span>
                      </span>
                    );
                  })}

                  {/* Glowing tip star — sits exactly at the current progress edge */}
                  {percent > 0 && percent < 100 && (
                    <span
                      className="hl-dash-progress-star-indicator"
                      style={{ left: `${percent}%` }}
                    >
                      <i className="bx bxs-star" />
                    </span>
                  )}
                </div>
              </div>

              {/* Ribbon info box */}
              <div className="hl-dash-rewards-banner">
                <i className="bx bx-gift"></i>
                <p className="hl-dash-rewards-banner-text">
                  {points >= goal
                    ? 'Congratulations! You can now claim your free wig reward.'
                    : `Earn ${goal - points} more points for a free wig`}
                </p>
              </div>
            </section>

            {/* Referral Form card */}
            <section className="hl-dash-card">
              <h2 className="hl-dash-ref-title">Have a referral code?</h2>
              <p className="hl-dash-ref-desc">Enter your code below to earn Star Points.</p>
              
              <div className="hl-dash-ref-form">
                <input
                  className="hl-dash-ref-input"
                  id="referralCode"
                  type="text"
                  placeholder="Enter code here"
                  value={referralCode}
                  onChange={e => setReferralCode(e.target.value)}
                  disabled={referralStatus !== 'idle'}
                />
                <button
                  className="hl-dash-ref-submit-btn"
                  type="button"
                  onClick={handleReferralSubmit}
                  disabled={referralStatus !== 'idle' || !referralCode.trim()}
                >
                  {referralStatus === 'submitting' ? 'Submitting...' : 'Submit Code'}
                </button>
              </div>
            </section>

            {/* Claimable Actions Section */}
            <section>
              <div className="hl-dash-claim-header">
                <div className="hl-dash-claim-header-left">
                  <div className="hl-dash-claim-header-icon">
                    <i className="bx bx-star"></i>
                  </div>
                  <h2 className="hl-dash-claim-header-title">Claimable Actions</h2>
                </div>
                <Link to="/donor/donate" className="hl-dash-claim-view-all">
                  View all <i className="bx bx-right-arrow-alt"></i>
                </Link>
              </div>

              <div className="hl-dash-claim-grid">
                
                {/* Hair donation card */}
                <article className="hl-dash-claim-item-card hair">
                  <div className="hl-dash-claim-item-ill">
                    <HairIllustrationSVG />
                  </div>
                  <div className="hl-dash-claim-item-details">
                    <h3 className="hl-dash-claim-item-title">Donate Hair</h3>
                    <p className="hl-dash-claim-item-desc">
                      Give confidence to someone in need by donating your hair.
                    </p>
                    <Link className="hl-dash-claim-item-btn" to="/donor/donate">
                      Donate Hair
                    </Link>
                  </div>
                </article>

                {/* Monetary donation card */}
                <article className="hl-dash-claim-item-card monetary">
                  <div className="hl-dash-claim-item-ill">
                    <HandHeartIllustrationSVG />
                  </div>
                  <div className="hl-dash-claim-item-details">
                    <h3 className="hl-dash-claim-item-title">Monetary Donation</h3>
                    <p className="hl-dash-claim-item-desc">
                      Support the cause by making a financial contribution to HairLink.
                    </p>
                    <Link className="hl-dash-claim-item-btn" to="/donor/monetary">
                      Support Now
                    </Link>
                  </div>
                </article>

              </div>
            </section>

          </div>

          {/* RIGHT COLUMN */}
          <div className="hl-dash-right-col">
            
            <Link to="/donor/tracking" className="hl-dash-action-card">
              <div className="hl-dash-action-left">
                <div className="hl-dash-action-icon-wrap">
                  <i className="bx bx-buildings"></i>
                </div>
                <span className="hl-dash-action-text">Track Donations</span>
              </div>
              <i className="bx bx-chevron-right hl-dash-action-arrow"></i>
            </Link>

            <Link to="/donor/certificate" className="hl-dash-action-card">
              <div className="hl-dash-action-left">
                <div className="hl-dash-action-icon-wrap">
                  <i className="bx bx-award"></i>
                </div>
                <span className="hl-dash-action-text">My Certificate</span>
              </div>
              <i className="bx bx-chevron-right hl-dash-action-arrow"></i>
            </Link>

            <Link to="/donor/community" className="hl-dash-action-card">
              <div className="hl-dash-action-left">
                <div className="hl-dash-action-icon-wrap">
                  <i className="bx bx-group"></i>
                </div>
                <span className="hl-dash-action-text">Community Support</span>
              </div>
              <i className="bx bx-chevron-right hl-dash-action-arrow"></i>
            </Link>

            <Link to="/donor/profile" className="hl-dash-action-card">
              <div className="hl-dash-action-left">
                <div className="hl-dash-action-icon-wrap">
                  <i className="bx bx-user"></i>
                </div>
                <span className="hl-dash-action-text">My Profile</span>
              </div>
              <i className="bx bx-chevron-right hl-dash-action-arrow"></i>
            </Link>

            <Link to="/donor/monetary" style={{ marginTop: '8px', display: 'block', width: '100%' }}>
              <button className="hl-dash-donate-money-btn">
                <i className="bx bx-donate-heart" style={{ fontSize: '1.2rem' }}></i> Donate Money
              </button>
            </Link>

          </div>

        </div>

        {/* BOTTOM SECTION: Impact Statistics & Banner */}
        <section className="hl-dash-bottom-section">
          <h2 className="hl-dash-bottom-title">Your Impact at a Glance</h2>
          
          <div className="hl-dash-stats-grid">
            
            {/* Card 1: Hair Donations */}
            <div className="hl-dash-stat-card">
              <div className="hl-dash-stat-icon-circle">
                <i className="bx bx-cut"></i>
              </div>
              <span className="hl-dash-stat-value">{hairDonations}</span>
              <p className="hl-dash-stat-label">Hair Donations</p>
            </div>

            {/* Card 2: Referrals */}
            <div className="hl-dash-stat-card">
              <div className="hl-dash-stat-icon-circle">
                <i className="bx bx-user-plus"></i>
              </div>
              <span className="hl-dash-stat-value">{referrals}</span>
              <p className="hl-dash-stat-label">Referrals</p>
            </div>

            {/* Card 3: Pesos Donated */}
            <div className="hl-dash-stat-card">
              <div className="hl-dash-stat-icon-circle">
                <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>₱</span>
              </div>
              <span className="hl-dash-stat-value">{monetaryAmount.toLocaleString()}</span>
              <p className="hl-dash-stat-label">Pesos Donated</p>
            </div>

            {/* Card 4: Star Points Earned */}
            <div className="hl-dash-stat-card">
              <div className="hl-dash-stat-icon-circle">
                <i className="bx bx-star"></i>
              </div>
              <span className="hl-dash-stat-value">{points}</span>
              <p className="hl-dash-stat-label">Star Points Earned</p>
            </div>

          </div>

          {/* Footer Motivational Ribbon */}
          <div className="hl-dash-footer-banner">
            <div className="hl-dash-footer-banner-left">
              <i className="bx bx-gift"></i>
            </div>
            <p className="hl-dash-footer-banner-text">
              Keep going! Your generosity brings hope and confidence. Thank you for being a part of the HairLink community.
            </p>
            <div className="hl-dash-footer-banner-right">
              <i className="bx bx-heart"></i>
            </div>
          </div>

        </section>

      </div>
    </div>

    {/* ── Free Wig Milestone Modal ── */}
    {showMilestoneModal && (
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }}
      >
        <div style={{
          background: '#fff', borderRadius: '24px', padding: '2.5rem',
          maxWidth: '440px', width: '100%',
          boxShadow: '0 32px 80px rgba(214,59,138,0.2)',
          textAlign: 'center', fontFamily: 'Inter, sans-serif',
        }}>
          {/* Celebration icon */}
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #fce4ec, #f8bbd9)',
            display: 'grid', placeItems: 'center', margin: '0 auto 1rem',
            boxShadow: '0 8px 20px rgba(214,59,138,0.18)',
          }}>
            <i className='bx bxs-gift' style={{ fontSize: '2.25rem', color: '#ad246d' }}></i>
          </div>

          <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.5rem', fontWeight: 800, color: '#1a1a1a' }}>
            Wig Reward Unlocked
          </h2>
          <p style={{ margin: '0 0 1.25rem', fontSize: '0.9rem', color: '#6b7280', lineHeight: 1.6 }}>
            Thank you for your generosity. You've reached <strong>100 Star Points</strong> and earned a complimentary HairLink wig as a token of our appreciation.
          </p>

          {/* Voucher code */}
          {milestoneVoucher && (
            <div style={{
              background: '#fdf2f8', border: '1.5px dashed #D63B8A',
              borderRadius: '12px', padding: '1rem 1.25rem',
              marginBottom: '1.25rem',
            }}>
              <p style={{ margin: '0 0 0.35rem', fontSize: '0.72rem', fontWeight: 700, color: '#D63B8A', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Voucher Reference</p>
              <code style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1a1a1a', letterSpacing: '2px' }}>{milestoneVoucher.code}</code>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.72rem', color: '#8c7895' }}>Please keep this reference for verification.</p>
            </div>
          )}

          {/* Redemption info */}
          <div style={{
            background: '#f9fafb', borderRadius: '12px', padding: '1rem 1.25rem',
            marginBottom: '1.5rem', textAlign: 'left',
          }}>
            <p style={{ margin: '0 0 0.4rem', fontWeight: 700, fontSize: '0.85rem', color: '#374151', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className='bx bx-info-circle' style={{ color: '#ad246d' }}></i>
              How to redeem your wig
            </p>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#6b7280', lineHeight: 1.6 }}>
              Please contact our partner wigmaker and present your voucher reference above. Our team will guide you through fitting and personalisation so your custom wig matches your preferences.
            </p>
          </div>

          <button
            onClick={handleMilestoneConfirm}
            style={{
              width: '100%', padding: '0.85rem',
              borderRadius: '50px', border: 'none',
              background: 'linear-gradient(135deg,#D63B8A,#e8559e)',
              color: '#fff', fontWeight: 800, fontSize: '1rem',
              cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(214,59,138,0.35)',
            }}
          >
            Acknowledge &amp; Save Voucher
          </button>
        </div>
      </div>
    )}
    </>
  );
};

export default DonorDashboard;
