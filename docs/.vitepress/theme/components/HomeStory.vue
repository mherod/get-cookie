<template>
  <section class="cookie-story" aria-labelledby="cookie-story-title">
    <div class="cookie-story__heading">
      <p class="cookie-eyebrow">A deliberately small surface</p>
      <h2 id="cookie-story-title">
        Bring the browser profile.<br />
        Keep the credential local.
      </h2>
      <p>
        get-cookie does one sensitive job and keeps the path legible from
        source to consumer.
      </p>
    </div>

    <div class="cookie-route" aria-label="How get-cookie works">
      <div class="cookie-route__step">
        <span class="cookie-route__number">01</span>
        <span class="cookie-route__icon cookie-route__icon--browser">
          <i></i><i></i><i></i>
        </span>
        <strong>Browser profile</strong>
        <small>Your local encrypted store</small>
      </div>
      <span class="cookie-route__arrow" aria-hidden="true">→</span>
      <div class="cookie-route__step">
        <span class="cookie-route__number">02</span>
        <span class="cookie-route__icon cookie-route__icon--prompt">›_</span>
        <strong>Typed query</strong>
        <small>CLI or TypeScript library</small>
      </div>
      <span class="cookie-route__arrow" aria-hidden="true">→</span>
      <div class="cookie-route__step">
        <span class="cookie-route__number">03</span>
        <span class="cookie-route__icon cookie-route__icon--lock">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
            <rect x="5.5" y="10" width="13" height="10" rx="2" />
            <path d="M8.5 10V7.5a3.5 3.5 0 1 1 7 0V10" />
          </svg>
        </span>
        <strong>Controlled use</strong>
        <small>You decide where it goes</small>
      </div>
    </div>
  </section>
</template>
