/**
 * CONTEÚDO PADRÃO DO CANTINHO (textos, fotos, vídeos, músicas, cartas, datas).
 * É o ponto de partida do Backoffice: tudo pode ser editado em /admin/conteudos.
 * A aparência (cores, móveis, personagens, pet) fica em houseConfig.ts.
 *
 * As mídias de exemplo (fotos, vídeos e músicas) foram geradas para esta demo
 * e podem ser usadas livremente. Substitua por arquivos próprios ou com licença
 * adequada em src/assets/media/.
 */
import type { HouseContent } from '../types/house';

import track1 from '../assets/media/audio/faixa-01-domingo-de-manha.mp3';
import track2 from '../assets/media/audio/faixa-02-cafe-pra-dois.mp3';
import track3 from '../assets/media/audio/faixa-03-luz-do-abajur.mp3';

import video1 from '../assets/media/videos/video-01-primeira-viagem.mp4';
import video1Poster from '../assets/media/videos/video-01-primeira-viagem-poster.png';
import video2 from '../assets/media/videos/video-02-aniversario.mp4';
import video2Poster from '../assets/media/videos/video-02-aniversario-poster.png';

import photo1 from '../assets/media/photos/foto-01-primeiro-cafe.png';
import photo2 from '../assets/media/photos/foto-02-por-do-sol.png';
import photo3 from '../assets/media/photos/foto-03-biscoito.png';
import photo4 from '../assets/media/photos/foto-04-piquenique.png';
import photo5 from '../assets/media/photos/foto-05-show-na-chuva.png';
import photo6 from '../assets/media/photos/foto-06-natal.png';

export const defaultContent: HouseContent = {
  houseName: 'Nosso cantinho',

  welcome: {
    title: 'Um cantinho especial para você.',
    description: 'Cada cantinho desta casa guarda uma lembrança. Entre e descubra.',
    button: 'Entrar no cantinho',
    note: 'Esta casa tem música — o som só começa quando você der play.',
  },

  hint: 'Passe o mouse ou toque nos objetos para descobrir lembranças',

  phrases: {
    character1: 'Que bom que você chegou!',
    character2: 'Senta aqui, o filme já vai começar.',
    character3: 'Tem espaço para mais uma pessoa!',
    character4: 'Agora cabem todos no nosso cantinho.',
    pet: '{nome}: mrrrau!',
  },

  playlist: {
    name: 'Trilha do nosso cantinho',
    keepPlayingOnClose: true,
    tracks: [
      { id: 't1', title: 'Domingo de manhã', artist: 'Faixa de demonstração', src: track1, license: 'Gerada para esta demo — uso livre' },
      { id: 't2', title: 'Café pra dois', artist: 'Faixa de demonstração', src: track2, license: 'Gerada para esta demo — uso livre' },
      { id: 't3', title: 'Luz do abajur', artist: 'Faixa de demonstração', src: track3, license: 'Gerada para esta demo — uso livre' },
    ],
  },

  videos: [
    { id: 'v1', title: 'Nossa primeira viagem', src: video1, poster: video1Poster, description: 'Serra, neblina e muita risada.' },
    { id: 'v2', title: 'Aniversário surpresa', src: video2, poster: video2Poster, description: 'A noite em que ninguém conseguiu guardar segredo.' },
  ],

  photos: [
    { id: 'p1', src: photo1, alt: 'Ilustração de um casal sob o céu de fim de tarde', caption: 'Primeiro café juntos' },
    { id: 'p2', src: photo2, alt: 'Ilustração de um pôr do sol rosado nas montanhas', caption: 'Pôr do sol na serra' },
    { id: 'p3', src: photo3, alt: 'Ilustração em tons de rosa', caption: 'Biscoito chegou em casa' },
    { id: 'p4', src: photo4, alt: 'Ilustração de um casal num campo verde', caption: 'Piquenique no parque' },
    { id: 'p5', src: photo5, alt: 'Ilustração de uma noite azul e chuvosa', caption: 'Show na chuva' },
    { id: 'p6', src: photo6, alt: 'Ilustração de uma noite estrelada com neve', caption: 'Natal em família' },
  ],

  letters: [
    {
      id: 'l1',
      title: 'Para o dia em que você precisar lembrar',
      date: 'Escrita numa terça qualquer',
      author: 'Lia',
      body: 'Oi, você.\n\nSe estiver lendo isto num dia cinza, saiba que eu guardo aqui cada risada sua que já ouvi. Elas fazem um barulho bom dentro de mim.\n\nVolte sempre que quiser. A casa também é sua.',
    },
    {
      id: 'l2',
      title: 'Sobre aquele primeiro café',
      date: '3 de novembro de 2022',
      author: 'Lia',
      body: 'Fiquei tão nervosa que pedi um café de que nem gosto. Você percebeu e não disse nada — só empurrou o açúcar para perto de mim.\n\nFoi ali que eu soube.',
    },
    {
      id: 'l3',
      title: 'Promessas pequenas',
      date: '14 de fevereiro de 2024',
      author: 'Théo',
      body: 'Prometo dividir a última fatia de bolo. Prometo deixar o abajur aceso quando você chegar tarde.\n\nPrometo continuar escolhendo você nas coisas pequenas, que são as que mais importam.',
    },
  ],

  togetherSince: { date: '2023-02-14', label: 'dias juntos' },

  specialDates: [
    { id: 'd1', title: 'Primeiro encontro', date: '2022-11-03', description: 'Um café que virou um passeio de três horas pela cidade.' },
    { id: 'd2', title: 'Início do namoro', date: '2023-02-14', description: 'Uma conversa que durou até a madrugada e terminou num sim.' },
    { id: 'd3', title: 'Primeira viagem', date: '2023-07-22', description: 'Serra, neblina e chocolate quente na varanda.' },
    { id: 'd4', title: 'Aniversário da Lia', date: '2024-05-18', description: 'Bolo de cenoura com cobertura dupla e o Biscoito roubando a vela.' },
  ],

  chestMessages: [
    { id: 'm1', text: 'Uma das minhas melhores lembranças é ter você por perto.' },
    { id: 'm2', text: 'Você é o meu lugar favorito para voltar.' },
    { id: 'm3', text: 'Obrigado por fazer dos dias comuns os mais bonitos.' },
    { id: 'm4', text: 'Ainda rio sozinha lembrando daquela viagem.' },
    { id: 'm5', text: 'Se eu pudesse guardar um momento, seria qualquer um com você.' },
  ],
};
