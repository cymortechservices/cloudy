# Free-tier notes (verify current terms before launch)
Plans and limits change; confirm on each provider's pricing page.
- **Cloudflare R2:** a free monthly allowance of storage and operations has been offered (historically 10 GB-month, with Class A/B operation allowances) and egress to the internet is not charged. R2 may require a payment method to activate. Set `GLOBAL_STORAGE_CAP_BYTES` below the allowance.
- **Supabase Free:** limited database size, auth users, and bandwidth; projects may pause after inactivity. Built-in auth email is rate limited; use custom SMTP for real launches.
- **Render Free web service:** sleeps after inactivity (first request is slow), limited hours/resources; the 10-minute cleanup timer does not run while asleep, so use an external cron on `/api/v1/maintenance/cleanup`.
- **Vercel Hobby:** non-commercial use terms and bandwidth limits; check them if Cloudy is a paid product.
Storage capacity, monthly operations, egress, DB size and frontend bandwidth are separate limits; exhausting any one can break the service.
