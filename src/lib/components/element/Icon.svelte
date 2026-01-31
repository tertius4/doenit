<script>
  const { name, class: className = "" } = $props();
</script>

<svg aria-hidden="true" width={28} height={28} class={className}>
  <use href="#{name}" />
</svg>

<svg style="display: none;">
  <symbol id="arrow-left" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
  </symbol>
  <symbol id="arrow-right" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4-4 4M3 12h18" />
  </symbol>
  <symbol id="back" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
  </symbol>
  <symbol
    id="bell"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path>
    <path d="m13.73 21a2 2 0 0 1-3.46 0"></path>
  </symbol>
  <symbol
    id="burger"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <line x1="3" y1="6" x2="21" y2="6"></line>
    <line x1="3" y1="12" x2="21" y2="12"></line>
    <line x1="3" y1="18" x2="21" y2="18"></line>
  </symbol>
  <symbol
    id="camera"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
    <circle cx="12" cy="13" r="3" />
  </symbol>
  <symbol
    id="categories"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
  </symbol>
  <symbol
    id="chart-bar"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <line x1="12" y1="20" x2="12" y2="10" />
    <line x1="18" y1="20" x2="18" y2="4" />
    <line x1="6" y1="20" x2="6" y2="16" />
  </symbol>
  <symbol
    id="check"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <polyline points="20 6 9 17 4 12"></polyline>
  </symbol>
  <symbol
    id="check-circle"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </symbol>
  <symbol
    id="chevron-left"
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12.5 15L7.5 10L12.5 5" />
  </symbol>
  <symbol
    id="chevron-right"
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7.5 15L12.5 10L7.5 5" />
  </symbol>
  <symbol
    id="clock"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12,6 12,12 16,14" />
  </symbol>
  <symbol id="crown" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path
      d="M2 19H22V21H2V19ZM2 5L7 9L12 2L17 9L22 5V17H2V5ZM12 11.5C11.17 11.5 10.5 10.83 10.5 10C10.5 9.17 11.17 8.5 12 8.5C12.83 8.5 13.5 9.17 13.5 10C13.5 10.83 12.83 11.5 12 11.5Z"
    />
  </symbol>
  <symbol
    id="download"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path
      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
    />
  </symbol>
  <symbol
    id="download-cloud"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
  </symbol>
  <symbol
    id="edit"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path
      d="M16.862 3.487l3.65 3.65a1.5 1.5 0 010 2.121l-9.193 9.193a1 1 0 01-.502.27l-4 1a1 1 0 01-1.263-1.263l1-4a1 1 0 01.27-.502l9.193-9.193a1.5 1.5 0 012.121 0z"
    />
  </symbol>
  <symbol
    id="gallery"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </symbol>
  <symbol id="google" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </symbol>
  <symbol id="home" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round">
    <path d="M3 12l9-9 9 9" />
    <path d="M6 12v7a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-7" />
    <path d="M10 21v-6a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v6" />
  </symbol>
  <symbol id="important" viewBox="0 0 512 512" fill="currentColor">
    <path
      d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zm0-384c13.3 0 24 10.7 24 24V264c0 13.3-10.7 24-24 24s-24-10.7-24-24V152c0-13.3 10.7-24 24-24zM224 352a32 32 0 1 1 64 0 32 32 0 1 1 -64 0z"
    />
  </symbol>
  <symbol id="info" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2" />
    <path d="M12 16v-4m0-4h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none" />
  </symbol>
  <symbol id="leave" viewBox="0 0 640 640" fill="currentColor">
    <path
      d="M328.3 88C328.3 57.1 353.4 32 384.3 32C415.2 32 440.3 57.1 440.3 88C440.3 118.9 415.2 144 384.3 144C353.4 144 328.3 118.9 328.3 88zM320.3 269.3L297.7 291.9C291.7 297.9 288.3 306 288.3 314.5L288.3 352C288.3 364.3 281.3 375 271.1 380.4C270.2 384.6 268.7 388.8 266.8 392.7L197.8 530.8L197 530.4L169.3 585.7C159.4 605.5 135.4 613.5 115.6 603.6L78.6 585C58.8 575.1 50.8 551.1 60.7 531.3L111.3 430.3C121.2 410.5 145.2 402.5 165 412.4L195.7 427.7L224 371.1C224.3 370.5 224.4 369.9 224.4 369.3L224.4 352.4C224.4 352.2 224.4 352.1 224.4 351.9L224.4 314.4C224.4 288.9 234.5 264.5 252.5 246.5L287.6 211.4C310.4 188.6 341.2 175.8 373.4 175.8C410.3 175.8 445.2 192.6 468.2 221.4L486.1 244C492.2 251.6 501.4 256 511.1 256L544.3 256C562 256 576.3 270.3 576.3 288C576.3 305.7 562 320 544.3 320L511.1 320C481.9 320 454.4 306.7 436.1 284L432.3 279.3L432.3 394.5L466.8 424.1C484.5 439.3 496.1 460.3 499.4 483.4L512 571.5C514.5 589 502.3 605.2 484.8 607.7C467.3 610.2 451.1 598 448.6 580.5L436 492.4C434.9 484.7 431 477.7 425.1 472.6L353.7 411.4C332.4 393.2 320.2 366.5 320.2 338.5L320.2 269.2zM320.4 435.1C322.8 437.4 325.2 439.7 327.8 441.9L373.8 481.3L371.6 488.9C367.1 504.6 358.7 518.9 347.2 530.4L278.9 598.7C266.4 611.2 246.1 611.2 233.6 598.7C221.1 586.2 221.1 565.9 233.6 553.4L302 485.1C305.8 481.3 308.6 476.5 310.1 471.3L320.4 435z"
    />
  </symbol>
  <symbol id="loading" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
    <path
      class="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </symbol>
  <symbol
    id="lock"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </symbol>
  <symbol id="mail" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
    />
  </symbol>
  <symbol id="moon" viewBox="0 0 24 24" fill="none">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor" />
  </symbol>
  <symbol
    id="more"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <circle cx="12" cy="12" r="10" stroke="currentColor" fill="none"></circle>
    <circle cx="12" cy="12" r="1"></circle>
    <circle cx="17" cy="12" r="1"></circle>
    <circle cx="7" cy="12" r="1"></circle>
  </symbol>
  <symbol
    id="new"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M8 12h8" />
    <path d="M12 8v8" />
  </symbol>
  <symbol
    id="offline"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M22.61 16.95A5 5 0 0 0 18 10h-1.26a8 8 0 0 0-7.05-6M5 5a8 8 0 0 0 4 15h9a5 5 0 0 0 1.7-.3" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </symbol>
  <symbol id="plus" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 4v16m8-8H4" />
  </symbol>
  <symbol id="restore" viewBox="0 0 640 640" fill="currentColor">
    <path
      d="M320 128C426 128 512 214 512 320C512 426 426 512 320 512C254.8 512 197.1 479.5 162.4 429.7C152.3 415.2 132.3 411.7 117.8 421.8C103.3 431.9 99.8 451.9 109.9 466.4C156.1 532.6 233 576 320 576C461.4 576 576 461.4 576 320C576 178.6 461.4 64 320 64C234.3 64 158.5 106.1 112 170.7L112 144C112 126.3 97.7 112 80 112C62.3 112 48 126.3 48 144L48 256C48 273.7 62.3 288 80 288L104.6 288C105.1 288 105.6 288 106.1 288L192.1 288C209.8 288 224.1 273.7 224.1 256C224.1 238.3 209.8 224 192.1 224L153.8 224C186.9 166.6 249 128 320 128zM344 216C344 202.7 333.3 192 320 192C306.7 192 296 202.7 296 216L296 320C296 326.4 298.5 332.5 303 337L375 409C384.4 418.4 399.6 418.4 408.9 409C418.2 399.6 418.3 384.4 408.9 375.1L343.9 310.1L343.9 216z"
    />
  </symbol>
  <symbol id="save" viewBox="0 0 24 24" fill="currentColor">
    <path
      d="M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7l-4-4zM12 19a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm3-10H5V5h10v4z"
    />
  </symbol>
  <symbol
    id="search"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-label="Search icon"
  >
    <circle cx="11" cy="11" r="7" />
    <line x1="16.5" y1="16.5" x2="21" y2="21" />
  </symbol>
  <symbol
    id="settings"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <circle cx="12" cy="12" r="3" />
    <path
      d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
    />
  </symbol>
  <symbol
    id="shared"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
  </symbol>
  <symbol id="share" viewBox="0 0 640 640" fill="currentColor">
    <path
      d="M448 256C501 256 544 213 544 160C544 107 501 64 448 64C395 64 352 107 352 160C352 165.4 352.5 170.8 353.3 176L223.6 248.1C206.7 233.1 184.4 224 160 224C107 224 64 267 64 320C64 373 107 416 160 416C184.4 416 206.6 406.9 223.6 391.9L353.3 464C352.4 469.2 352 474.5 352 480C352 533 395 576 448 576C501 576 544 533 544 480C544 427 501 384 448 384C423.6 384 401.4 393.1 384.4 408.1L254.7 336C255.6 330.8 256 325.5 256 320C256 314.5 255.5 309.2 254.7 304L384.4 231.9C401.3 246.9 423.6 256 448 256z"
    />
  </symbol>
  <symbol id="star" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
  </symbol>
  <symbol id="sun" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="12" r="5" />
    <path
      d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
    />
  </symbol>
  <symbol id="sync" viewBox="0 0 512 512" fill="currentColor">
    <path
      d="M440.7 12.6l4 82.8A247.2 247.2 0 0 0 255.8 8C134.7 8 33.9 94.9 12.3 209.8A12 12 0 0 0 24.1 224h49.1a12 12 0 0 0 11.7-9.3 175.9 175.9 0 0 1 317-56.9l-101.5-4.9a12 12 0 0 0 -12.6 12v47.4a12 12 0 0 0 12 12H500a12 12 0 0 0 12-12V12a12 12 0 0 0 -12-12h-47.4a12 12 0 0 0 -12 12.6zM255.8 432a175.6 175.6 0 0 1 -146-77.8l101.8 4.9a12 12 0 0 0 12.6-12v-47.4a12 12 0 0 0 -12-12H12a12 12 0 0 0 -12 12V500a12 12 0 0 0 12 12h47.4a12 12 0 0 0 12-12.6l-4.2-82.6A247.2 247.2 0 0 0 255.8 504c121.1 0 221.9-86.9 243.6-201.8a12 12 0 0 0 -11.8-14.2h-49.1a12 12 0 0 0 -11.7 9.3A175.9 175.9 0 0 1 255.8 432z"
    />
  </symbol>
  <symbol
    id="test-tube"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
    <polyline points="14,2 14,8 20,8"></polyline>
    <path d="M9 15h6"></path>
    <path d="m12 18 3-3-3-3"></path>
  </symbol>
  <symbol
    id="times"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </symbol>
  <symbol
    id="trash"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M3 6h18"></path>
    <path d="M10 3h4"></path>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
    <line x1="10" y1="10" x2="10" y2="18"></line>
    <line x1="14" y1="10" x2="14" y2="18"></line>
  </symbol>
  <symbol
    id="upload"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </symbol>
  <symbol id="user-plus" viewBox="0 0 640 640" fill="currentColor">
    <path
      d="M136 192C136 125.7 189.7 72 256 72C322.3 72 376 125.7 376 192C376 258.3 322.3 312 256 312C189.7 312 136 258.3 136 192zM48 546.3C48 447.8 127.8 368 226.3 368L285.7 368C384.2 368 464 447.8 464 546.3C464 562.7 450.7 576 434.3 576L77.7 576C61.3 576 48 562.7 48 546.3zM544 160C557.3 160 568 170.7 568 184L568 232L616 232C629.3 232 640 242.7 640 256C640 269.3 629.3 280 616 280L568 280L568 328C568 341.3 557.3 352 544 352C530.7 352 520 341.3 520 328L520 280L472 280C458.7 280 448 269.3 448 256C448 242.7 458.7 232 472 232L520 232L520 184C520 170.7 530.7 160 544 160z"
    />
  </symbol>
  <symbol id="users" viewBox="0 0 640 512" fill="currentColor">
    <path
      d="M320 16a104 104 0 1 1 0 208 104 104 0 1 1 0-208zM96 88a72 72 0 1 1 0 144 72 72 0 1 1 0-144zM0 416c0-70.7 57.3-128 128-128 12.8 0 25.2 1.9 36.9 5.4-32.9 36.8-52.9 85.4-52.9 138.6l0 16c0 11.4 2.4 22.2 6.7 32L32 480c-17.7 0-32-14.3-32-32l0-32zm521.3 64c4.3-9.8 6.7-20.6 6.7-32l0-16c0-53.2-20-101.8-52.9-138.6 11.7-3.5 24.1-5.4 36.9-5.4 70.7 0 128 57.3 128 128l0 32c0 17.7-14.3 32-32 32l-86.7 0zM472 160a72 72 0 1 1 144 0 72 72 0 1 1 -144 0zM160 432c0-88.4 71.6-160 160-160s160 71.6 160 160l0 16c0 17.7-14.3 32-32 32l-256 0c-17.7 0-32-14.3-32-32l0-16z"
    />
  </symbol>
  <symbol
    id="x"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </symbol>
  <symbol
    id="x-circle"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="15" y1="9" x2="9" y2="15"></line>
    <line x1="9" y1="9" x2="15" y2="15"></line>
  </symbol>
</svg>
