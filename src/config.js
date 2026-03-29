// App configuration from environment variables
export const config = {
  /** Self-hosted mode — hides registration, simplifies flows */
  selfHosted: import.meta.env.VITE_SELF_HOSTED === 'true',

  /** Whether email/SMTP is configured — controls magic link & forgot password visibility */
  mailEnabled: import.meta.env.VITE_MAIL_ENABLED !== 'false', // default true unless explicitly disabled
}
