const { createCanvas } = require('canvas');
const { urlEndpoint, logoUrl } = require("../config.json");
async function fetchUser(pseudo, EmbedBuilder, AttachmentBuilder) {
  try {
    const user = await getUserData(pseudo);
    if (!user) return { userEmbed: null, attachment: null };

    const [progressionData, stats] = await Promise.all([
      fetch(`${urlEndpoint}/progression/anime/${user.uid}`).then(r => r.json()),
      fetch(`${urlEndpoint}/progression/anime/stats/status/${user.uid}`).then(r => r.json())
    ]);

    const calculatedStats = progressionData.reduce((acc, { progression: { progression, rewatch = 0 } }) => {
      acc.totalProgression += progression;
      acc.rewatchedEpisodes += rewatch * progression;
      acc.rewatchedAnimes += rewatch;
      return acc;
    }, { 
      totalEpisodes: progressionData.length, 
      totalProgression: 0, 
      rewatchedEpisodes: 0, 
      rewatchedAnimes: 0 
    });

    const imageCanvas = await createStatsCanvas(stats, {
      episodes: calculatedStats.totalEpisodes,
      addition: calculatedStats.totalProgression,
      revisionageAnime: calculatedStats.rewatchedAnimes,
      revisionageEpisode: calculatedStats.rewatchedEpisodes
    });

    // Conversion de la date
    const creationDate = new Date(Number(user.createdAt));
    const formattedDate = `${creationDate.getDate()}/${creationDate.getMonth() + 1}/${creationDate.getFullYear()}`;

    // Badges utilisateur
    const badges = [
      user.isPremium ? "★" : "",
      user.isStaff ? "🛡️" : ""
    ].filter(Boolean).join(" ");

    return {
      userEmbed: new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle(`${user.username} ${badges}`)
        .setURL(`https://hyakanime.fr/user/${user.username}`)
        .setAuthor({ name: "Hyakanime", iconURL: logoUrl, url: "https://hyakanime.fr" })
        .setThumbnail(user.photoURL)
        .setImage("attachment://stats.png")
        .setTimestamp()
        .setFooter({ text: `Compte créé le ${formattedDate}` }),
      attachment: new AttachmentBuilder(imageCanvas, { name: 'stats.png' })
    };
  } catch (error) {
    console.error('Erreur fetchUser:', error);
    throw error;
  }
}

async function getUserData(pseudo) {
  const response = await fetch(`${urlEndpoint}/user/${pseudo}`);
  const result = await response.json();

  if (result?.message) {
    const searchResults = await fetch(`${urlEndpoint}/search/user/${pseudo}`).then(r => r.json());
    return searchResults[0] || null;
  }

  return result;
}

async function createStatsCanvas(statsHyak, userStats) {
  const canvas = createCanvas(490, 200);
  const ctx = canvas.getContext('2d');

  const stats = {
    aVoir: statsHyak["2"] || 0,
    enPause: statsHyak["4"] || 0,
    enCours: statsHyak["1"] || 0,
    termine: statsHyak["3"] || 0,
    abandonne: statsHyak["5"] || 0,
    total: statsHyak["total"] || 0,
  };

  const { episodes, addition, revisionageAnime, revisionageEpisode } = userStats;

  const colors = {
    aVoir: '#9f9f9f',
    enPause: '#A16EFF',
    enCours: '#0099FF',
    termine: '#00CC33',
    abandonne: '#FF3333',
    text: '#FFFFFF',
  };

  ctx.font = 'bold 16px Arial';

  const userLabels = [
    { label: 'Titres ajoutés', value: episodes },
    { label: 'Titres rewatch', value: revisionageAnime },
    { label: 'Épisodes vus', value: addition },
    { label: 'Épisodes rewatch', value: revisionageEpisode },
  ];

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 16px Arial';
  userLabels.forEach((data, i) => {
    const x = i < 2 ? 25 : 260;
    const y = 60 + (i % 2) * 20;
    ctx.fillText(`${data.label}: ${data.value}`, x, y);
  });

  const statsLabels = [
    { label: 'Total', value: stats.total, color: colors.text },
    { label: 'À voir', value: stats.aVoir, color: colors.aVoir },
    { label: 'En Pause', value: stats.enPause, color: colors.enPause },
    { label: 'En cours', value: stats.enCours, color: colors.enCours },
    { label: 'Terminé', value: stats.termine, color: colors.termine },
    { label: 'Abandonné', value: stats.abandonne, color: colors.abandonne },
  ];

  statsLabels.forEach(({ label, value, color }, index) => {
    const x = index < 3 ? 25 : 260;
    const y = 120 + (index % 3) * 20;
    ctx.fillStyle = color;
    ctx.fillText(`${label}: ${value}`, x, y);
  });

  

  // Barre de progression
  drawProgressBar(ctx, 20, 180, 430, 15, stats, colors);

  return canvas.toBuffer();
}

  
  function drawProgressBar(ctx, x, y, width, height, stats, colors) {
    let currentX = x;
    const borderRadius = 7;
    const sections = [
      { value: stats.enCours, color: colors.enCours },
      { value: stats.aVoir, color: colors.aVoir },
      { value: stats.termine, color: colors.termine },
      { value: stats.enPause, color: colors.enPause },
      { value: stats.abandonne, color: colors.abandonne }
    ].filter(section => section.value > 0);
  
    sections.forEach((section, index) => {
      let sectionWidth = (section.value / stats.total) * width;
      drawRoundedRect(ctx, currentX, y, sectionWidth, height, borderRadius, section.color,
        index === 0, index === sections.length - 1);
      currentX += sectionWidth;
    });
  }
  
  function drawRoundedRect(ctx, x, y, width, height, radius, color, leftRound, rightRound) {
    ctx.fillStyle = color;
    ctx.beginPath();
  
    if (leftRound) {
      ctx.moveTo(x + radius, y);
      ctx.arcTo(x, y, x, y + radius, radius);
      ctx.lineTo(x, y + height - radius);
      ctx.arcTo(x, y + height, x + radius, y + height, radius);
    } else {
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + height);
    }
  
    if (rightRound) {
      ctx.lineTo(x + width - radius, y + height);
      ctx.arcTo(x + width, y + height, x + width, y + height - radius, radius);
      ctx.lineTo(x + width, y + radius);
      ctx.arcTo(x + width, y, x + width - radius, y, radius);
    } else {
      ctx.lineTo(x + width, y + height);
      ctx.lineTo(x + width, y);
    }
  
    ctx.closePath();
    ctx.fill();
  }
  
  module.exports = { fetchUser };