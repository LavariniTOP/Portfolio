// Cena 3D fixa da página inteira: terreno de pontos no hero + um sólido que acompanha o scroll.
// Um único canvas (fixo atrás do conteúdo); sem WebGL ou CDN, sobra o fundo em CSS.
const stage = document.getElementById('stage');
const canvas = document.getElementById('scene');

// Com "reduzir movimento" a cena aparece, mas sem animação contínua (o scroll ainda posiciona o objeto).
const semMovimento = matchMedia('(prefers-reduced-motion: reduce)').matches;
const larga = matchMedia('(min-width: 768px)').matches; // terreno de pontos só em telas largas

const carregarThree = () => import('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js');

iniciar();

async function iniciar() {
  let THREE;
  try {
    THREE = await carregarThree();
  } catch {
    return; // sem rede para o CDN: mantém o fundo em CSS
  }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch {
    return; // sem WebGL
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.autoClear = false; // duas cenas no mesmo canvas: terreno e sólido

  /* ---------- Terreno (hero) ---------- */
  const cenaTerreno = new THREE.Scene();
  const camTerreno = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  const matTerreno = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 }, uScale: { value: 1 }, uP: { value: 0 }, uObj: { value: new THREE.Vector2(9, 9) }, uObjR: { value: 0.3 }, uAsp: { value: 1 }, uOrb: { value: new THREE.Vector2(9, 9) }, uOrbK: { value: 0 } },
    vertexShader: `
      uniform float uTime; uniform float uScale; uniform float uP;
      uniform vec2 uObj; uniform float uObjR; uniform float uAsp; uniform vec2 uOrb; uniform float uOrbK;
      varying float vA; varying float vY;
      void main() {
        vec3 p = position;
        float t = uTime;
        p.y = sin(p.x * 0.32 + t * 0.45) * cos(p.z * 0.27 + t * 0.35) * 1.3
            + sin(p.x * 0.11 + p.z * 0.17 + t * 0.2) * 2.4;
        // interação: o sólido empurra o terreno e gera ondas ao redor (distância medida na tela)
        vec4 c0 = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        float d = length((c0.xy / c0.w - uObj) * vec2(uAsp, 1.0));
        vec2 dO = (c0.xy / c0.w - uOrb) * vec2(uAsp, 1.0);
        vY = exp(-dot(dO, dO) / 0.05) * uOrbK; // pontos perto do orbe amarelo viram amarelos
        float perto = exp(-d * d / (uObjR * uObjR));
        p.y += perto * 1.6 + sin(d * 14.0 - t * 3.0) * exp(-d * 2.2) * 0.7;
        p.y *= 1.0 + uP * 2.2; // ao rolar, o terreno cresce e se dissolve
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(34.0 * uScale / -mv.z, 1.0, 4.0);
        vA = smoothstep(46.0, 8.0, -mv.z) * (0.35 + 0.65 * smoothstep(-2.5, 3.5, p.y) + perto * 0.6) * (1.0 - uP) * (1.0 + vY);
      }`,
    fragmentShader: `
      varying float vA; varying float vY;
      void main() {
        if (length(gl_PointCoord - 0.5) > 0.5) discard;
        gl_FragColor = vec4(mix(vec3(0.76, 0.82, 0.88), vec3(1.0, 0.91, 0.0), clamp(vY * 1.5, 0.0, 1.0)), vA);
      }`,
  });
  if (larga) {
    const N = 140, SIZE = 60; // 19.600 pontos
    const pos = new Float32Array(N * N * 3);
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const k = (i * N + j) * 3;
        pos[k] = (i / (N - 1) - 0.5) * SIZE;
        pos[k + 2] = (j / (N - 1) - 0.5) * SIZE - 8;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    cenaTerreno.add(new THREE.Points(geo, matTerreno));
  }

  /* ---------- Sólido que viaja com o scroll ---------- */
  const cenaObj = new THREE.Scene();
  const camObj = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
  camObj.position.z = 9;
  const pivo = new THREE.Group();
  const matFio = (op) => new THREE.MeshBasicMaterial({ color: 0xc1ccd8, wireframe: true, transparent: true, opacity: op });
  const externo = new THREE.Mesh(new THREE.IcosahedronGeometry(1.4, 1), matFio(1));
  const interno = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 0), matFio(1));
  const ponto = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffe800 }));
  ponto.material.transparent = true;
  pivo.add(externo, interno, ponto);

  // Orbe amarelo com vida: brilho pulsante e rastro de cometa.
  const gc = document.createElement('canvas');
  gc.width = gc.height = 64;
  const gg = gc.getContext('2d');
  const grad = gg.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,232,0,1)');
  grad.addColorStop(0.25, 'rgba(255,232,0,0.45)');
  grad.addColorStop(1, 'rgba(255,232,0,0)');
  gg.fillStyle = grad;
  gg.fillRect(0, 0, 64, 64);
  const brilho = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(gc), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));

  const NR = 56; // pontos do rastro
  const rastroPos = new Float32Array(NR * 3);
  const rastroCor = new Float32Array(NR * 3);
  for (let n = 0; n < NR; n++) { // amarelo que esmaece até preto (invisível no blend aditivo)
    const f = Math.pow(1 - n / NR, 2);
    rastroCor.set([f, f * 0.91, 0], n * 3);
  }
  const rastroGeo = new THREE.BufferGeometry();
  rastroGeo.setAttribute('position', new THREE.BufferAttribute(rastroPos, 3));
  rastroGeo.setAttribute('color', new THREE.BufferAttribute(rastroCor, 3));
  const rastro = new THREE.Points(rastroGeo, new THREE.PointsMaterial({ size: 0.07, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  rastro.frustumCulled = false;
  pivo.add(brilho, rastro);
  cenaObj.add(pivo);

  // Rótulos das habilidades: aparecem quando o sólido vira a "nuvem" (seção Habilidades).
  await document.fonts.ready; // texto desenhado em canvas precisa da fonte já carregada
  const nomes = ['HTML5', 'CSS3', 'JavaScript', 'Vite', 'Git', 'Python', 'SQL', 'C#', 'Prompts'];
  const rotulos = nomes.map((nome, i) => {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 64;
    const g = c.getContext('2d');
    g.font = '400 26px "IBM Plex Mono", monospace';
    g.fillStyle = '#fff';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(nome.toUpperCase(), 128, 32);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, opacity: 0 }));
    sp.scale.set(0.95, 0.24, 1);
    // espiral de Fibonacci: pontos espaçados de forma uniforme na esfera
    const yy = 1 - (i / (nomes.length - 1)) * 2;
    const raio = Math.sqrt(1 - yy * yy);
    const ang = i * 2.399963;
    sp.position.set(Math.cos(ang) * raio * 1.45, yy * 1.45, Math.sin(ang) * raio * 1.45);
    pivo.add(sp);
    return sp;
  });

  // arrastar a nuvem para girar (touch-action: pan-y no CSS mantém a rolagem vertical no celular)
  const nuvem = document.getElementById('cloud');
  const giro = { x: 0, y: 0, vx: 0, vy: 0, arrastando: false, px: 0, py: 0 };
  nuvem.addEventListener('pointerdown', (e) => { giro.arrastando = true; giro.px = e.clientX; giro.py = e.clientY; nuvem.setPointerCapture(e.pointerId); });
  nuvem.addEventListener('pointerup', () => { giro.arrastando = false; });
  nuvem.addEventListener('pointermove', (e) => {
    if (!giro.arrastando) return;
    giro.vy = (e.clientX - giro.px) * 0.006;
    giro.vx = (e.clientY - giro.py) * 0.006;
    giro.px = e.clientX; giro.py = e.clientY;
  });

  // Posição (x como fração da meia-largura visível), altura, escala e opacidade em cada seção.
    const K = [
    { x: 0.55, y: -0.12, s: 1.5, o: 0.55 }, // hero: logo acima das ondas, para interagir com elas
    { x: 0.72, y: 0.1, s: 0.9, o: 0.3 },
    { x: 0.0, y: 0.0, s: 1, o: 0.14 }, // habilidades: substituído pela posição de #cloud em destino()
    { x: -0.85, y: -0.4, s: 0.9, o: 0.3 }, // projeto 1: embaixo do texto, à esquerda
    { x: 0.95, y: 0.4, s: 0.7, o: 0.25 }, // projeto 2: do outro lado
    { x: -0.72, y: -0.3, s: 1.3, o: 0.3 }, // contato: esquerda, abaixo da frase, longe do formulário
  ];
  const projetos = document.querySelectorAll('.project');
  const secoes = [document.getElementById('inicio'), document.getElementById('sobre'), document.getElementById('habilidades'), projetos[0], projetos[1], document.getElementById('contato')];
  let tops = [];
  const medir = () => { tops = secoes.map((s) => s.getBoundingClientRect().top + scrollY); };
  const suave = (u) => u * u * (3 - 2 * u);
  const atual = { ...K[0] };
  let mAtual = 0;
  const vTmp = new THREE.Vector3();
  const eixoX = new THREE.Vector3(1, 0, 0), eixoZ = new THREE.Vector3(0, 0, 1);

  function redimensionar() {
    const { clientWidth: w, clientHeight: h } = stage;
    renderer.setSize(w, h, false);
    for (const c of [camTerreno, camObj]) { c.aspect = w / h; c.updateProjectionMatrix(); }
    matTerreno.uniforms.uScale.value = h / 900 * renderer.getPixelRatio();
    medir();
  }
  redimensionar();
  new ResizeObserver(redimensionar).observe(stage);
  new ResizeObserver(medir).observe(document.body); // altura muda quando imagens/fontes carregam

  const alvo = { x: 0, y: 0 };
  addEventListener('pointermove', (e) => {
    if (semMovimento) return;
    alvo.x = e.clientX / innerWidth - 0.5;
    alvo.y = e.clientY / innerHeight - 0.5;
  }, { passive: true });

  const inicio = performance.now();
  let primeiro = true;

  function quadro() {
    requestAnimationFrame(quadro);
    if (document.hidden) return;
    const t = semMovimento ? 3 : (performance.now() - inicio) / 1000;
    const prog = Math.min(scrollY / innerHeight, 1);

    // terreno: só enquanto o hero está visível
    renderer.clear();
    if (larga && prog < 1) {
      matTerreno.uniforms.uTime.value = t;
      matTerreno.uniforms.uP.value = prog;
      camTerreno.position.x += (alvo.x * 3 - camTerreno.position.x) * 0.04;
      camTerreno.position.y += (4.5 - prog * 3 - alvo.y * 2 - camTerreno.position.y) * 0.08;
      camTerreno.position.z = 14 - prog * 6;
      camTerreno.lookAt(0, 0, -4);
      renderer.render(cenaTerreno, camTerreno);
    }

    // sólido: interpola entre as seções conforme o meio da tela passa por elas
    const meiaAltura = Math.tan((camObj.fov / 2) * Math.PI / 180) * camObj.position.z;
    const estreita = camObj.aspect < 1;
    const y = scrollY + innerHeight * 0.5;
    let i = 0;
    while (i < tops.length - 1 && y >= tops[i + 1]) i++;
    const j = Math.min(i + 1, K.length - 1);
    let raw = i === j ? 0 : Math.min(Math.max((y - tops[i]) / (tops[j] - tops[i]), 0), 1);
    // pausa na nuvem: chega cedo (80% do trecho) e só sai quando falta 30% da seção Habilidades
    if (j === 2) raw = Math.min(raw / 0.8, 1);
    if (i === 2) raw = Math.min(Math.max((raw - 0.7) / 0.3, 0), 1);
    const u = suave(raw);
    // em Habilidades o destino é a posição real da caixa #cloud na tela (ela acompanha o layout)
    const destino = (n) => {
      if (n !== 2) return K[n];
      const r = nuvem.getBoundingClientRect();
      return {
        x: ((r.left + r.width / 2 - innerWidth / 2) / innerWidth * 2) / 0.85,
        y: -((r.top + r.height / 2 - innerHeight / 2) / innerHeight * 2),
        s: (r.width / innerHeight * 2 * meiaAltura) / 3.0,
        o: 0.14,
      };
    };
    const A = destino(i), B = destino(j);
    for (const k of ['x', 'y', 's', 'o']) {
      atual[k] += (A[k] + (B[k] - A[k]) * u - atual[k]) * 0.08; // inércia: o objeto "desliza" atrás do scroll
    }
    // m: quanto o sólido já virou nuvem (0 = icosaedro, 1 = esfera de rótulos)
    const m = j === 2 ? u : i === 2 ? 1 - u : 0;
    mAtual += (m - mAtual) * 0.1;

    // no celular o sólido fica centralizado, menor e mais apagado; como nuvem ele ocupa o tamanho total
    const balanco = (1 - mAtual) * Math.min(scrollY / innerHeight, 3) * 0.04; // leve vaivém enquanto você desce
    pivo.position.set(estreita ? 0 : (atual.x + Math.sin(scrollY * 0.003) * balanco * 3) * meiaAltura * camObj.aspect * 0.85, (atual.y + Math.cos(scrollY * 0.004) * balanco * 2) * meiaAltura, 0);
    // posição do sólido na tela alimenta a interação com o terreno (um quadro de atraso, imperceptível)
    vTmp.copy(pivo.position).project(camObj);
    matTerreno.uniforms.uObj.value.set(vTmp.x, vTmp.y);
    matTerreno.uniforms.uObjR.value = 0.22 * atual.s;
    matTerreno.uniforms.uAsp.value = camObj.aspect;
    pivo.scale.setScalar(atual.s * (estreita ? 0.55 + 0.45 * mAtual : 1));
    externo.material.opacity = atual.o * (estreita ? 0.5 + 0.5 * mAtual : 1);
    interno.material.opacity = externo.material.opacity * (1 - mAtual);
    ponto.material.opacity = 1 - mAtual;

    // arraste da nuvem + giro lento; solta e volta ao giro automático
    if (!semMovimento) {
      giro.x += giro.vx; giro.y += giro.vy;
      giro.vx *= 0.95;
      if (!giro.arrastando) giro.vy *= 0.95;
    }
    pivo.rotation.set(scrollY * 0.0015 + alvo.y * 0.8 + giro.x, scrollY * 0.0025 + t * 0.12 + alvo.x * 0.8 + giro.y, 0);
    interno.rotation.set(-t * 0.3, t * 0.2, 0);
    // órbita elíptica inclinada, com velocidade variável e leve ondulação
    const th = t * 1.1 + Math.sin(t * 0.5) * 0.5;
    ponto.position.set(Math.cos(th) * 2.1, 0, Math.sin(th) * 1.7)
      .applyAxisAngle(eixoX, 0.55).applyAxisAngle(eixoZ, 0.3);
    ponto.position.y += Math.sin(t * 2.3) * 0.12;
    brilho.position.copy(ponto.position);
    const pulso = 0.5 + Math.sin(t * 3) * 0.12;
    brilho.scale.setScalar(pulso);
    ponto.scale.setScalar(1 + Math.sin(t * 3) * 0.2);
    rastroPos.copyWithin(3, 0, (NR - 1) * 3); // empurra o histórico e põe a posição atual na frente
    rastroPos.set([ponto.position.x, ponto.position.y, ponto.position.z], 0);
    rastroGeo.attributes.position.needsUpdate = true;
    const vivo = 1 - mAtual; // some junto com o ponto quando vira nuvem
    brilho.material.opacity = rastro.material.opacity = vivo;
    ponto.getWorldPosition(vTmp).project(camObj);
    matTerreno.uniforms.uOrb.value.set(vTmp.x, vTmp.y);
    matTerreno.uniforms.uOrbK.value = vivo;

    // rótulos: surgem com a transformação; os do fundo ficam mais apagados (profundidade)
    const raioMundo = 1.45 * pivo.scale.x;
    for (const sp of rotulos) {
      sp.getWorldPosition(vTmp);
      sp.material.opacity = mAtual * (0.2 + 0.8 * Math.min(Math.max((vTmp.z / raioMundo + 1) / 2, 0), 1));
    }
    renderer.clearDepth();
    renderer.render(cenaObj, camObj);

    if (primeiro) { primeiro = false; stage.classList.add('hero__stage--live'); }
  }
  quadro();

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    stage.classList.remove('hero__stage--live'); // volta ao fundo em CSS
  });
}
