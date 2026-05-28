export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { answers, company } = req.body;

    if (!answers || answers.length < 5) {
      return res.status(400).json({ error: 'Missing answers' });
    }

    const prompt = `Tu es une consultante experte en automatisation de process pour PME françaises. Ton nom est Charlotte, fondatrice de Risolvd.
Voici les réponses d'un prospect :
- Secteur : ${answers[0]}
- Taille équipe : ${answers[1]}
- Tâche la plus chronophage : ${answers[2]}
- Outils utilisés : ${answers[3]}
- Objectif : ${answers[4]}
${company ? `- Entreprise : ${company}` : ''}

Génère un mini-rapport d'audit personnalisé en français. Commence par un titre percutant en majuscules (5 mots max, pas de ponctuation).
Ensuite 3 paragraphes courts :
1. Ce que tu observes dans leur situation spécifique — concret, sectoriel, pas générique
2. Les 2-3 automatisations les plus impactantes pour eux avec des exemples très concrets tirés de leur secteur
3. Le temps estimé gagné par semaine et une seule action concrète : "Listez les 3 [tâches spécifiques à leur secteur] que vous refaites chaque semaine. Réservez un appel — c'est par là qu'on commence."

Ton : direct, expert, sans jargon, sans bullshit. Pas de bullet points. Prose uniquement. 200 mots maximum.`;

    // Appel Claude
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!claudeResponse.ok) {
      const err = await claudeResponse.text();
      console.error('Claude error:', err);
      return res.status(500).json({ error: 'Claude API error', detail: err });
    }

    const claudeData = await claudeResponse.json();
    const text = claudeData.content.map(b => b.text || '').join('');
    const lines = text.trim().split('\n');
    const title = lines[0].replace(/^#+\s*/, '');
    const body = lines.slice(1).join('\n').trim();

    // Envoi email via Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'audit@risolvd.fr',
        to: 'contact@risolvd.fr',
        subject: `Nouvel audit — ${company || 'Anonyme'} (${answers[0]})`,
        html: `
          <h2>Nouvel audit complété sur risolvd.com</h2>
          <hr/>
          <h3>Réponses du prospect</h3>
          <ul>
            <li><strong>Entreprise :</strong> ${company || 'Non renseigné'}</li>
            <li><strong>Secteur :</strong> ${answers[0]}</li>
            <li><strong>Taille équipe :</strong> ${answers[1]}</li>
            <li><strong>Tâche chronophage :</strong> ${answers[2]}</li>
            <li><strong>Outils :</strong> ${answers[3]}</li>
            <li><strong>Objectif :</strong> ${answers[4]}</li>
          </ul>
          <hr/>
          <h3>Rapport généré</h3>
          <h4>${title}</h4>
          <p>${body.replace(/\n/g, '<br/>')}</p>
        `
      })
    });

    if (!emailResponse.ok) {
      const emailErr = await emailResponse.text();
      console.error('Resend error:', emailErr);
    }

    res.status(200).json({ title, body });

  } catch (error) {
    console.error('Handler error:', error);
    res.status(500).json({ error: error.message });
  }
}
