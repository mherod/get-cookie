<template>
  <div class="cookie-hero-visual" aria-hidden="true">
    <div class="cookie-orbit cookie-orbit--one"></div>
    <div class="cookie-orbit cookie-orbit--two"></div>

    <div class="cookie-terminal">
      <div class="cookie-terminal__bar">
        <div class="cookie-terminal__lights">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <span class="cookie-terminal__title">local-session</span>
        <span class="cookie-terminal__status">read only</span>
      </div>

      <div class="cookie-terminal__body">
        <div class="cookie-command">
          <span class="cookie-command__prompt">$</span>
          <code>get-cookie sessionid example.com</code>
        </div>

        <div class="cookie-output">
          <span class="cookie-output__label">profile</span>
          <span>Chrome / Work</span>
        </div>
        <div class="cookie-output">
          <span class="cookie-output__label">result</span>
          <span class="cookie-output__success">1 cookie found</span>
        </div>

        <div class="cookie-terminal__rule"></div>

        <div class="cookie-scope">
          <span class="cookie-scope__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
              <path d="M12 3.5 19 6v5.35c0 4.15-2.75 7.55-7 9.15-4.25-1.6-7-5-7-9.15V6l7-2.5Z" />
              <path d="m8.7 12 2.15 2.15 4.45-4.45" />
            </svg>
          </span>
          <span>
            <strong>Stays on this machine</strong>
            <small>Nothing leaves unless you send it.</small>
          </span>
        </div>
      </div>
    </div>

    <div class="cookie-stamp">
      <span>LOCAL</span>
      <span>ONLY</span>
    </div>
  </div>
</template>
