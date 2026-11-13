const nav = document.getElementById('nav');
const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');
const navCurrent = document.getElementById('navCurrent');
const navLinks = document.querySelectorAll('.nav__link');

/* Menu mobile */
function fecharMenu() {
  nav.classList.remove('nav--open');
  navToggle.setAttribute('aria-expanded', 'false');
}
navToggle.addEventListener('click', () => {
  const aberto = nav.classList.toggle('nav--open');
  navToggle.setAttribute('aria-expanded', String(aberto));
});
navLinks.forEach((link) => link.addEventListener('click', fecharMenu));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharMenu(); });
document.addEventListener('click', (e) => { if (!nav.contains(e.target)) fecharMenu(); });

/* Navegação expandida no topo, recolhida ao rolar */
const hero = document.getElementById('inicio');
new IntersectionObserver(([e]) => nav.classList.toggle('nav--top', e.intersectionRatio > 0.6), { threshold: [0, 0.6, 1] }).observe(hero);

/* Seção atual */
const spy = new IntersectionObserver(
  (entradas) => {
    entradas.forEach((entrada) => {
      if (!entrada.isIntersecting) return;
      const id = entrada.target.id;
      navLinks.forEach((link) => {
        const ativo = link.getAttribute('href') === `#${id}`;
        link.classList.toggle('nav__link--active', ativo);
        if (ativo) {
          link.setAttribute('aria-current', 'true');
          navCurrent.textContent = link.textContent;
        } else {
          link.removeAttribute('aria-current');
        }
      });
    });
  },
  { rootMargin: '-40% 0px -55% 0px' }
);
document.querySelectorAll('main section[id]').forEach((s) => spy.observe(s));

/* Relógio (horário de Brasília) */
const relogio = document.getElementById('clock');
const formatoHora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
const atualizarHora = () => { relogio.textContent = formatoHora.format(new Date()); };
atualizarHora();
setInterval(atualizarHora, 30000);

/* Revelação ao rolar */
const revelar = new IntersectionObserver(
  (entradas) => entradas.forEach((e) => {
    if (e.isIntersecting) {
      e.target.classList.add('reveal--in');
      revelar.unobserve(e.target);
    }
  }),
  { threshold: 0.15 }
);
document.querySelectorAll('.reveal').forEach((el) => revelar.observe(el));

/* Voltar ao topo */
document.getElementById('toTop').addEventListener('click', () => window.scrollTo({ top: 0 }));

/* Formulário */
const form = document.getElementById('contactForm');
const campos = {
  nome: {
    input: document.getElementById('nome'),
    erro: document.getElementById('erroNome'),
    validar: (v) => v.trim().length >= 2 || 'Informe seu nome (mínimo 2 caracteres).',
  },
  email: {
    input: document.getElementById('email'),
    erro: document.getElementById('erroEmail'),
    validar: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || 'Informe um e-mail válido.',
  },
  mensagem: {
    input: document.getElementById('mensagem'),
    erro: document.getElementById('erroMensagem'),
    validar: (v) => v.trim().length >= 10 || 'A mensagem precisa de pelo menos 10 caracteres.',
  },
};

function validarCampo({ input, erro, validar }) {
  const resultado = validar(input.value);
  const valido = resultado === true;
  erro.textContent = valido ? '' : resultado;
  input.setAttribute('aria-invalid', String(!valido));
  return valido;
}

Object.values(campos).forEach((campo) => {
  campo.input.addEventListener('input', () => {
    if (campo.input.getAttribute('aria-invalid') === 'true') validarCampo(campo);
  });
});

const WEB3FORMS_KEY = 'cbdfc6d6-b638-43fd-b73c-2762c556520f';

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const tudoValido = Object.values(campos).map(validarCampo).every(Boolean);
  const status = document.getElementById('formSuccess');
  const botao = form.querySelector('button[type="submit"]');

  if (!tudoValido) {
    status.textContent = '';
    Object.values(campos).find((c) => c.input.getAttribute('aria-invalid') === 'true')?.input.focus();
    return;
  }

  botao.disabled = true;
  status.textContent = 'Enviando...';

  try {
    const dadosForm = new FormData();
    dadosForm.append('access_key', WEB3FORMS_KEY);
    dadosForm.append('subject', 'Nova mensagem pelo portfólio');
    dadosForm.append('name', campos.nome.input.value.trim());
    dadosForm.append('email', campos.email.input.value.trim());
    dadosForm.append('message', campos.mensagem.input.value.trim());

    const resposta = await fetch('https://api.web3forms.com/submit', { method: 'POST', body: dadosForm });
    const dados = await resposta.json();
    if (!dados.success) throw new Error(dados.message);

    status.textContent = 'Mensagem enviada! Obrigado pelo contato.';
    form.reset();
  } catch (erro) {
    console.error('Erro no envio:', erro);
    status.textContent = 'Não foi possível enviar agora. Tente pelo LinkedIn.';
  } finally {
    botao.disabled = false;
  }
});

/* Inclinação 3D nas imagens dos projetos (só com mouse e sem "reduzir movimento") */
if (matchMedia('(hover: hover) and (pointer: fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.querySelectorAll('.project__media').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--ry', `${((e.clientX - r.left) / r.width - 0.5) * 8}deg`);
      el.style.setProperty('--rx', `${-((e.clientY - r.top) / r.height - 0.5) * 8}deg`);
      el.classList.add('project__media--tilt');
    });
    el.addEventListener('pointerleave', () => el.classList.remove('project__media--tilt'));
  });
}

/* Rolagem suave (Lenis). Sem a biblioteca ou com "reduzir movimento", fica a rolagem nativa. */
if (window.Lenis && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const lenis = new Lenis({ anchors: true, lerp: 0.1 });
  const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
}
