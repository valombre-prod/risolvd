export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { answers } = req.body;

  const prompt = `Tu es une consultante experte en automatisation de process pour PME françaises. Ton nom est Charlotte, fondatrice de Risolvd.
Voici les réponses d'un prospect :
- Secteur : ${answers[0]}
- Taille équipe : ${answers[1]}
- Tâche la plus chronophage : ${answers[2]}
- Outils utilisés : ${answers[3]}
- Objectif : ${answers[4]}

Génère un mini-rapport d'audit personnalisé en français. Commence par un titre percutant en majuscules (5 mots max, pas de ponctuation).
Ensuite 3 paragraphes courts :
1. Ce que tu observes dans leur situation spécifique — concret, sectoriel, pas générique
2. Les 2-3 automatisations les plus impactantes pour eux avec des exemples très concrets tirés de leur secteur
3. Le temps estimé gagné par semaine et une seule action concrète : "Listez les 3 [tâches spécifiques à leur secteur] que vous refaites chaque semaine. Réservez un appel — c'est par là qu'on commence."

Ton : direct, expert, sans jargon, sans bullshit. Pas de bullet points. Prose uniquement. 200 mots maximum.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
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

    const data = await response.json();
    const text = data.content.map(b => b.text || '').join('');
    const lines = text.trim().split('\n');
    const title = lines[0].replace(/^#+\s*/, '');
    const body = lines.slice(1).join('\n').trim();

    res.status(200).json({ title, body });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
}
