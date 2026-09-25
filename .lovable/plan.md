# Fix the 3 deep security scan warnings

## What changes for you
1. **Private messages**: once a friendship is removed or declined, neither person can read or mark that old conversation. Only accepted friends can see messages.
2. **Study library uploads**: only safe study files are accepted (PDF, plain text, Markdown, CSV, Word, PNG, JPEG, WEBP). Anything else gets a clear "file type not supported" message.
3. **AI Tutor**: learners can no longer slip in fake "tutor said..." lines to change how the tutor answers. Normal conversations work exactly as before.

Profile pictures and community photos are left as they are, as you asked.

## Technical details
- Migration: recreate the `direct_messages` SELECT and UPDATE policies so the friendships EXISTS check also requires `f.status = 'accepted'`. Tighten the friendships UPDATE policy with a WITH CHECK so members cannot change `requester_id`/`addressee_id`.
- `src/lib/knowledge.functions.ts` (saveKnowledge): validate `data.file.mime` against an allowlist and check the file extension matches; reject otherwise before upload. Also restrict `allowed_mime_types` on the `knowledge` bucket.
- `src/lib/tutor.functions.ts`: only user messages are passed as `user`; earlier assistant replies are loaded from the learner's own saved `tutor_threads` record (by thread id) instead of trusted from the request. If no thread is given, previous assistant turns are folded into a clearly marked, untrusted "earlier conversation" note in the system prompt rather than sent as assistant turns.
- Mark the 3 findings fixed afterwards and confirm the build is clean.
