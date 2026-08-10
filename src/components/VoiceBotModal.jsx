const askGemini = async (question) => {
  if (!question?.trim() || processingRef.current) return;

  processingRef.current = true;
  setStatus('thinking');
  setError('');
  setTranscript(question);
  setReply('');

  try {
    const key = String(Config.GEMINI_API_KEY || '').trim();
    if (!key) {
      setError('GEMINI_API_KEY missing in .env');
      setStatus('idle');
      processingRef.current = false;
      return;
    }

    const lang = detectLang(question);

    // Build prompt
    const contextText = scanContext
      ? `Scan context:\n${typeof scanContext === 'string' ? scanContext : JSON.stringify(scanContext)}`
      : 'No previous scan available.';

    const prompt = `${SYSTEM_PROMPT}

${contextText}

User question: ${question}

Reply in the same language the user used. Keep answer short (2-4 sentences).`;

    // Call Gemini
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      },
    );

    const data = await res.json();
    console.log('Gemini response:', JSON.stringify(data)?.slice(0, 300));

    if (data?.error) {
      setError(data.error.message || 'Gemini error');
      setStatus('idle');
      processingRef.current = false;
      return;
    }

    const answer =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      (lang === 'ps'
        ? 'ځواب نشو موندلی.'
        : lang === 'ur'
        ? 'جواب نہیں مل سکا۔'
        : 'Could not get answer.');

    const clean = String(answer).replace(/\*/g, '').trim();
    setReply(clean);
    setStatus('speaking');

    // ===== TTS Voice Setup =====
    try {
      const voices = await Tts.voices();
      let selectedVoice = null;

      if (lang === 'ps') {
        selectedVoice =
          voices.find((v) => v.language?.startsWith('ur')) ||
          voices.find((v) => v.language?.startsWith('hi')) ||
          voices.find((v) => v.language?.startsWith('en'));
      } else if (lang === 'ur') {
        selectedVoice =
          voices.find((v) => v.language?.startsWith('ur')) ||
          voices.find((v) => v.language?.startsWith('hi')) ||
          voices.find((v) => v.language?.startsWith('en'));
      } else if (lang === 'hi') {
        selectedVoice =
          voices.find((v) => v.language?.startsWith('hi')) ||
          voices.find((v) => v.language?.startsWith('en'));
      } else {
        selectedVoice =
          voices.find((v) => v.language === 'en-US' || v.language?.startsWith('en')) ||
          voices[0];
      }

      if (selectedVoice?.id) {
        await Tts.setDefaultVoice(selectedVoice.id);
      }

      // Set language
      if (lang === 'ps' || lang === 'ur') {
        try {
          await Tts.setDefaultLanguage('ur-PK');
        } catch (_) {
          try {
            await Tts.setDefaultLanguage('hi-IN');
          } catch (__) {
            await Tts.setDefaultLanguage('en-US');
          }
        }
      } else if (lang === 'hi') {
        try {
          await Tts.setDefaultLanguage('hi-IN');
        } catch (_) {
          await Tts.setDefaultLanguage('en-US');
        }
      } else {
        await Tts.setDefaultLanguage('en-US');
      }

      // Rate & Pitch
      if (lang === 'ps') {
        await Tts.setDefaultRate(0.46);
        await Tts.setDefaultPitch(0.95);
      } else if (lang === 'ur') {
        await Tts.setDefaultRate(0.48);
        await Tts.setDefaultPitch(1.0);
      } else {
        await Tts.setDefaultRate(0.5);
        await Tts.setDefaultPitch(1.05);
      }
    } catch (_) {
      // ignore TTS setup errors
    }

    if (!cancelled.current) {
      Tts.speak(clean);
    }
  } catch (e) {
    console.log('Gemini fetch error', e);
    setError('Network error. Internet check karein.');
    setStatus('idle');
  } finally {
    processingRef.current = false;
  }
};