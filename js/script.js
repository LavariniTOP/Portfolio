const themeToggle = document.getElementById('themeToggle');

function aplicarTema(tema) {
  document.documentElement.dataset.theme = tema;
  themeToggle.setAttribute('aria-label', tema === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro');
}

aplicarTema(document.documentElement.dataset.theme);

themeToggle.addEventListener('click', () => {
  const novoTema = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('tema', novoTema);

  if (!document.startViewTransition) {
    aplicarTema(novoTema);
    return;
  }

  const caixa = themeToggle.getBoundingClientRect();
  document.documentElement.style.setProperty('--tema-x', `${caixa.left + caixa.width / 2}px`);
  document.documentElement.style.setProperty('--tema-y', `${caixa.top + caixa.height / 2}px`);
  document.startViewTransition(() => aplicarTema(novoTema));
});

const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');

navToggle.addEventListener('click', () => {
  const aberto = navMenu.classList.toggle('nav__menu--open');
  navToggle.setAttribute('aria-expanded', aberto);
  navToggle.setAttribute('aria-label', aberto ? 'Fechar menu' : 'Abrir menu');
});

navMenu.querySelectorAll('.nav__link').forEach((link) => {
  link.addEventListener('click', () => {
    navMenu.classList.remove('nav__menu--open');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});

const secoes = document.querySelectorAll('main section[id]');
const navLinks = document.querySelectorAll('.nav__link');

const spy = new IntersectionObserver(
  (entradas) => {
    entradas.forEach((entrada) => {
      if (entrada.isIntersecting) {
        const id = entrada.target.getAttribute('id');
        navLinks.forEach((link) => {
          link.classList.toggle('nav__link--active', link.getAttribute('href') === `#${id}`);
        });
      }
    });
  },
  { rootMargin: '-40% 0px -55% 0px' }
);
secoes.forEach((secao) => spy.observe(secao));

const cracha = document.querySelector('.about__figure');

const entortar = new IntersectionObserver(
  (entradas) => {
    if (entradas[0].isIntersecting) {
      cracha.classList.add('about__figure--torto');
      entortar.disconnect();
    }
  },
  { threshold: 0.6 }
);
entortar.observe(cracha);

const toTop = document.getElementById('toTop');

window.addEventListener('scroll', () => {

  toTop.hidden = window.scrollY < 600;
}, { passive: true });

toTop.addEventListener('click', () => {
  window.scrollTo({ top: 0 });
});

const form = document.getElementById('contactForm');
const campos = {
  nome: {
    input: document.getElementById('nome'),
    erro: document.getElementById('erroNome'),
    validar: (valor) => valor.trim().length >= 2 || 'Informe seu nome (mínimo 2 caracteres).',
  },
  email: {
    input: document.getElementById('email'),
    erro: document.getElementById('erroEmail'),

    validar: (valor) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor.trim()) || 'Informe um e-mail válido.',
  },
  mensagem: {
    input: document.getElementById('mensagem'),
    erro: document.getElementById('erroMensagem'),
    validar: (valor) => valor.trim().length >= 10 || 'A mensagem precisa de pelo menos 10 caracteres.',
  },
};

function validarCampo({ input, erro, validar }) {
  const resultado = validar(input.value);
  const valido = resultado === true;
  erro.textContent = valido ? '' : resultado;
  input.classList.toggle('form__input--invalid', !valido);
  input.setAttribute('aria-invalid', String(!valido));
  return valido;
}

Object.values(campos).forEach((campo) => {
  campo.input.addEventListener('input', () => {
    if (campo.input.classList.contains('form__input--invalid')) validarCampo(campo);
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
    const primeiroInvalido = Object.values(campos).find((c) => c.input.classList.contains('form__input--invalid'));
    if (primeiroInvalido) primeiroInvalido.input.focus();
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

    const resposta = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      body: dadosForm,
    });
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
