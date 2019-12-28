'use strict';

const Polyglot = require('../');
const expect = require('chai').expect;

describe('t', function () {
  const phrases = {
    hello: 'Hello',
    hi_name_welcome_to_place: 'Hi, %{name}, welcome to %{place}!',
    name_your_name_is_name: '%{name}, your name is %{name}!',
    empty_string: ''
  };

  let polyglot;
  beforeEach(function () {
    polyglot = new Polyglot({ phrases: phrases });
  });

  it('translates a simple string', function () {
    expect(polyglot.t('hello')).to.equal('Hello');
  });

  it('returns the key if translation not found', function () {
    expect(polyglot.t('bogus_key')).to.equal('bogus_key');
  });

  it('interpolates', function () {
    expect(polyglot.t('hi_name_welcome_to_place', {
      name: 'Spike',
      place: 'the webz'
    })).to.equal('Hi, Spike, welcome to the webz!');
  });

  it('interpolates with missing substitutions', function () {
    expect(polyglot.t('hi_name_welcome_to_place', {
      place: undefined
    })).to.equal('Hi, %{name}, welcome to %{place}!');
  });

  it('interpolates the same placeholder multiple times', function () {
    expect(polyglot.t('name_your_name_is_name', {
      name: 'Spike'
    })).to.equal('Spike, your name is Spike!');
  });

  it('allows you to supply default values', function () {
    expect(polyglot.t('can_i_call_you_name', {
      _: 'Can I call you %{name}?',
      name: 'Robert'
    })).to.equal('Can I call you Robert?');
  });

  it('returns the non-interpolated key if not initialized with allowMissing and translation not found', function () {
    expect(polyglot.t('Welcome %{name}', {
      name: 'Robert'
    })).to.equal('Welcome %{name}');
  });

  it('returns an interpolated key if initialized with allowMissing and translation not found', function () {
    const instance = new Polyglot({ phrases: phrases, allowMissing: true });
    expect(instance.t('Welcome %{name}', {
      name: 'Robert'
    })).to.equal('Welcome Robert');
  });

  describe('custom interpolation syntax', function () {
    const createWithInterpolation = function (interpolation) {
      return new Polyglot({ phrases: {}, allowMissing: true, interpolation: interpolation });
    };

    it('interpolates with the specified custom token syntax', function () {
      const instance = createWithInterpolation({ prefix: '{{', suffix: '}}' });
      expect(instance.t('Welcome {{name}}', {
        name: 'Robert'
      })).to.equal('Welcome Robert');
    });

    it('interpolates if the prefix and suffix are the same', function () {
      const instance = createWithInterpolation({ prefix: '|', suffix: '|' });
      expect(instance.t('Welcome |name|, how are you, |name|?', {
        name: 'Robert'
      })).to.equal('Welcome Robert, how are you, Robert?');
    });

    it('interpolates when using regular expression tokens', function () {
      const instance = createWithInterpolation({ prefix: '\\s.*', suffix: '\\d.+' });
      expect(instance.t('Welcome \\s.*name\\d.+', {
        name: 'Robert'
      })).to.equal('Welcome Robert');
    });

    it('throws an error when either prefix or suffix equals to pluralization delimiter', function () {
      expect(function () { createWithInterpolation({ prefix: '||||', suffix: '}}' }); }).to.throw(RangeError);
      expect(function () { createWithInterpolation({ prefix: '{{', suffix: '||||' }); }).to.throw(RangeError);
    });
  });

  it('returns the translation even if it is an empty string', function () {
    expect(polyglot.t('empty_string')).to.equal('');
  });

  it('returns the default value even if it is an empty string', function () {
    expect(polyglot.t('bogus_key', { _: '' })).to.equal('');
  });

  it('handles dollar signs in the substitution value', function () {
    expect(polyglot.t('hi_name_welcome_to_place', {
      name: '$abc $0',
      place: '$1 $&'
    })).to.equal('Hi, $abc $0, welcome to $1 $&!');
  });

  it('supports nested phrase objects', function () {
    const nestedPhrases = Object.freeze({
      nav: {
        presentations: 'Presentations',
        hi_user: 'Hi, %{user}.',
        cta: {
          join_now: 'Join now!'
        }
      },
      'header.sign_in': 'Sign In'
    });
    const instance = new Polyglot({ phrases: nestedPhrases });
    expect(instance.t('nav.presentations')).to.equal('Presentations');
    expect(instance.t('nav.hi_user', { user: 'Raph' })).to.equal('Hi, Raph.');
    expect(instance.t('nav.cta.join_now')).to.equal('Join now!');
    expect(instance.t('header.sign_in')).to.equal('Sign In');
  });

  describe('onMissingKey', function () {
    it('calls the function when a key is missing', function () {
      const expectedKey = 'some key';
      const expectedOptions = {};
      const expectedLocale = 'oz';
      const returnValue = {};
      const onMissingKey = function (key, options, locale) {
        expect(key).to.equal(expectedKey);
        expect(options).to.equal(expectedOptions);
        expect(locale).to.equal(expectedLocale);
        return returnValue;
      };
      const instance = new Polyglot({ onMissingKey: onMissingKey, locale: expectedLocale });
      const result = instance.t(expectedKey, expectedOptions);
      expect(result).to.equal(returnValue);
    });

    it('overrides allowMissing', function (done) {
      const missingKey = 'missing key';
      const onMissingKey = function (key) {
        expect(key).to.equal(missingKey);
        done();
      };
      const instance = new Polyglot({ onMissingKey: onMissingKey, allowMissing: true });
      instance.t(missingKey);
    });
  });
});

describe('pluralize', function () {
  const phrases = Object.freeze({
    count_name: '%{smart_count} Name |||| %{smart_count} Names'
  });

  let polyglot;
  beforeEach(function () {
    polyglot = new Polyglot({ phrases: phrases, locale: 'en' });
  });

  it('supports pluralization with an integer', function () {
    expect(polyglot.t('count_name', { smart_count: 0 })).to.equal('0 Names');
    expect(polyglot.t('count_name', { smart_count: 1 })).to.equal('1 Name');
    expect(polyglot.t('count_name', { smart_count: 2 })).to.equal('2 Names');
    expect(polyglot.t('count_name', { smart_count: 3 })).to.equal('3 Names');
  });

  it('accepts a number as a shortcut to pluralize a word', function () {
    expect(polyglot.t('count_name', 0)).to.equal('0 Names');
    expect(polyglot.t('count_name', 1)).to.equal('1 Name');
    expect(polyglot.t('count_name', 2)).to.equal('2 Names');
    expect(polyglot.t('count_name', 3)).to.equal('3 Names');
  });

  it('ignores a region subtag when choosing a pluralization rule', function () {
    const instance = new Polyglot({ phrases: phrases, locale: 'fr-FR' });
    // French rule: "0" is singular
    expect(instance.t('count_name', 0)).to.equal('0 Name');
  });
});

describe('locale-specific pluralization rules', function () {
  it('pluralizes in Arabic', function () {
    // English would be: "1 vote" / "%{smart_count} votes"
    const whatSomeoneTranslated = Object.freeze([
      'ولا صوت',
      'صوت واحد',
      'صوتان',
      '%{smart_count} أصوات',
      '%{smart_count} صوت',
      '%{smart_count} صوت'
    ]);
    const phrases = Object.freeze({
      n_votes: whatSomeoneTranslated.join(' |||| ')
    });

    const polyglot = new Polyglot({ phrases: phrases, locale: 'ar' });

    expect(polyglot.t('n_votes', 0)).to.equal('ولا صوت');
    expect(polyglot.t('n_votes', 1)).to.equal('صوت واحد');
    expect(polyglot.t('n_votes', 2)).to.equal('صوتان');
    expect(polyglot.t('n_votes', 3)).to.equal('3 أصوات');
    expect(polyglot.t('n_votes', 11)).to.equal('11 صوت');
    expect(polyglot.t('n_votes', 102)).to.equal('102 صوت');
  });

  it('pluralizes in Russian', function () {
    // English would be: "1 vote" / "%{smart_count} votes"
    const whatSomeoneTranslated = Object.freeze([
      '%{smart_count} машина',
      '%{smart_count} машины',
      '%{smart_count} машин'
    ]);
    const phrases = Object.freeze({
      n_votes: whatSomeoneTranslated.join(' |||| ')
    });

    const polyglotLanguageCode = new Polyglot({ phrases: phrases, locale: 'ru' });

    expect(polyglotLanguageCode.t('n_votes', 1)).to.equal('1 машина');
    expect(polyglotLanguageCode.t('n_votes', 11)).to.equal('11 машин');
    expect(polyglotLanguageCode.t('n_votes', 101)).to.equal('101 машина');
    expect(polyglotLanguageCode.t('n_votes', 112)).to.equal('112 машин');
    expect(polyglotLanguageCode.t('n_votes', 932)).to.equal('932 машины');
    expect(polyglotLanguageCode.t('n_votes', 324)).to.equal('324 машины');
    expect(polyglotLanguageCode.t('n_votes', 12)).to.equal('12 машин');
    expect(polyglotLanguageCode.t('n_votes', 13)).to.equal('13 машин');
    expect(polyglotLanguageCode.t('n_votes', 14)).to.equal('14 машин');
    expect(polyglotLanguageCode.t('n_votes', 15)).to.equal('15 машин');

    const polyglotLocaleId = new Polyglot({ phrases: phrases, locale: 'ru-RU' });

    expect(polyglotLocaleId.t('n_votes', 1)).to.equal('1 машина');
    expect(polyglotLocaleId.t('n_votes', 11)).to.equal('11 машин');
    expect(polyglotLocaleId.t('n_votes', 101)).to.equal('101 машина');
    expect(polyglotLocaleId.t('n_votes', 112)).to.equal('112 машин');
    expect(polyglotLocaleId.t('n_votes', 932)).to.equal('932 машины');
    expect(polyglotLocaleId.t('n_votes', 324)).to.equal('324 машины');
    expect(polyglotLocaleId.t('n_votes', 12)).to.equal('12 машин');
    expect(polyglotLocaleId.t('n_votes', 13)).to.equal('13 машин');
    expect(polyglotLocaleId.t('n_votes', 14)).to.equal('14 машин');
    expect(polyglotLocaleId.t('n_votes', 15)).to.equal('15 машин');
  });

  it('pluralizes in Croatian (guest) Test', function () {
    // English would be: "1 vote" / "%{smart_count} votes"
    const whatSomeoneTranslated = Object.freeze([
      '%{smart_count} gost',
      '%{smart_count} gosta',
      '%{smart_count} gostiju'
    ]);
    const phrases = Object.freeze({
      n_guests: whatSomeoneTranslated.join(' |||| ')
    });

    const polyglotLocale = new Polyglot({ phrases: phrases, locale: 'hr-HR' });

    expect(polyglotLocale.t('n_guests', 1)).to.equal('1 gost');
    expect(polyglotLocale.t('n_guests', 11)).to.equal('11 gostiju');
    expect(polyglotLocale.t('n_guests', 21)).to.equal('21 gost');

    expect(polyglotLocale.t('n_guests', 2)).to.equal('2 gosta');
    expect(polyglotLocale.t('n_guests', 3)).to.equal('3 gosta');
    expect(polyglotLocale.t('n_guests', 4)).to.equal('4 gosta');

    expect(polyglotLocale.t('n_guests', 12)).to.equal('12 gostiju');
    expect(polyglotLocale.t('n_guests', 13)).to.equal('13 gostiju');
    expect(polyglotLocale.t('n_guests', 14)).to.equal('14 gostiju');
    expect(polyglotLocale.t('n_guests', 112)).to.equal('112 gostiju');
    expect(polyglotLocale.t('n_guests', 113)).to.equal('113 gostiju');
    expect(polyglotLocale.t('n_guests', 114)).to.equal('114 gostiju');
  });

  it('pluralizes in Croatian (vote) Test', function () {
    // English would be: "1 vote" / "%{smart_count} votes"
    const whatSomeoneTranslated = Object.freeze([
      '%{smart_count} glas',
      '%{smart_count} glasa',
      '%{smart_count} glasova'
    ]);
    const phrases = Object.freeze({
      n_votes: whatSomeoneTranslated.join(' |||| ')
    });

    const polyglotLocale = new Polyglot({ phrases: phrases, locale: 'hr-HR' });

    [1, 21, 31, 101].forEach(function (c) {
      expect(polyglotLocale.t('n_votes', c)).to.equal(c + ' glas');
    });
    [2, 3, 4, 22, 23, 24, 32, 33, 34].forEach(function (c) {
      expect(polyglotLocale.t('n_votes', c)).to.equal(c + ' glasa');
    });
    [0, 5, 6, 11, 12, 13, 14, 15, 16, 17, 25, 26, 35, 36, 112, 113, 114].forEach(function (c) {
      expect(polyglotLocale.t('n_votes', c)).to.equal(c + ' glasova');
    });

    const polyglotLanguageCode = new Polyglot({ phrases: phrases, locale: 'hr' });

    [1, 21, 31, 101].forEach(function (c) {
      expect(polyglotLanguageCode.t('n_votes', c)).to.equal(c + ' glas');
    });
    [2, 3, 4, 22, 23, 24, 32, 33, 34].forEach(function (c) {
      expect(polyglotLanguageCode.t('n_votes', c)).to.equal(c + ' glasa');
    });
    [0, 5, 6, 11, 12, 13, 14, 15, 16, 17, 25, 26, 35, 36, 112, 113, 114].forEach(function (c) {
      expect(polyglotLanguageCode.t('n_votes', c)).to.equal(c + ' glasova');
    });
  });

  it('pluralizes in Serbian (Latin & Cyrillic)', function () {
    // English would be: "1 vote" / "%{smart_count} votes"
    const whatSomeoneTranslated = Object.freeze([
      '%{smart_count} miš',
      '%{smart_count} miša',
      '%{smart_count} miševa'
    ]);
    const phrases = Object.freeze({
      n_votes: whatSomeoneTranslated.join(' |||| ')
    });

    const polyglotLatin = new Polyglot({ phrases: phrases, locale: 'srl-RS' });

    expect(polyglotLatin.t('n_votes', 1)).to.equal('1 miš');
    expect(polyglotLatin.t('n_votes', 11)).to.equal('11 miševa');
    expect(polyglotLatin.t('n_votes', 101)).to.equal('101 miš');
    expect(polyglotLatin.t('n_votes', 932)).to.equal('932 miša');
    expect(polyglotLatin.t('n_votes', 324)).to.equal('324 miša');
    expect(polyglotLatin.t('n_votes', 12)).to.equal('12 miševa');
    expect(polyglotLatin.t('n_votes', 13)).to.equal('13 miševa');
    expect(polyglotLatin.t('n_votes', 14)).to.equal('14 miševa');
    expect(polyglotLatin.t('n_votes', 15)).to.equal('15 miševa');
    expect(polyglotLatin.t('n_votes', 0)).to.equal('0 miševa');

    const polyglotCyrillic = new Polyglot({ phrases: phrases, locale: 'sr-RS' });

    expect(polyglotCyrillic.t('n_votes', 1)).to.equal('1 miš');
    expect(polyglotCyrillic.t('n_votes', 11)).to.equal('11 miševa');
    expect(polyglotCyrillic.t('n_votes', 101)).to.equal('101 miš');
    expect(polyglotCyrillic.t('n_votes', 932)).to.equal('932 miša');
    expect(polyglotCyrillic.t('n_votes', 324)).to.equal('324 miša');
    expect(polyglotCyrillic.t('n_votes', 12)).to.equal('12 miševa');
    expect(polyglotCyrillic.t('n_votes', 13)).to.equal('13 miševa');
    expect(polyglotCyrillic.t('n_votes', 14)).to.equal('14 miševa');
    expect(polyglotCyrillic.t('n_votes', 15)).to.equal('15 miševa');
    expect(polyglotCyrillic.t('n_votes', 0)).to.equal('0 miševa');
  });

  it('pluralizes in Bosnian (Latin & Cyrillic)', function () {
    // English would be: "1 vote" / "%{smart_count} votes"
    const whatSomeoneTranslated = Object.freeze([
      '%{smart_count} članak',
      '%{smart_count} članka',
      '%{smart_count} članaka'
    ]);
    const phrases = Object.freeze({
      n_votes: whatSomeoneTranslated.join(' |||| ')
    });

    const polyglotLatin = new Polyglot({ phrases: phrases, locale: 'bs-Latn-BA' });

    expect(polyglotLatin.t('n_votes', 1)).to.equal('1 članak');
    expect(polyglotLatin.t('n_votes', 11)).to.equal('11 članaka');
    expect(polyglotLatin.t('n_votes', 101)).to.equal('101 članak');
    expect(polyglotLatin.t('n_votes', 932)).to.equal('932 članka');
    expect(polyglotLatin.t('n_votes', 324)).to.equal('324 članka');
    expect(polyglotLatin.t('n_votes', 12)).to.equal('12 članaka');
    expect(polyglotLatin.t('n_votes', 13)).to.equal('13 članaka');
    expect(polyglotLatin.t('n_votes', 14)).to.equal('14 članaka');
    expect(polyglotLatin.t('n_votes', 15)).to.equal('15 članaka');
    expect(polyglotLatin.t('n_votes', 112)).to.equal('112 članaka');
    expect(polyglotLatin.t('n_votes', 113)).to.equal('113 članaka');
    expect(polyglotLatin.t('n_votes', 114)).to.equal('114 članaka');
    expect(polyglotLatin.t('n_votes', 115)).to.equal('115 članaka');
    expect(polyglotLatin.t('n_votes', 0)).to.equal('0 članaka');

    const polyglotCyrillic = new Polyglot({ phrases: phrases, locale: 'bs-Cyrl-BA' });

    expect(polyglotCyrillic.t('n_votes', 1)).to.equal('1 članak');
    expect(polyglotCyrillic.t('n_votes', 11)).to.equal('11 članaka');
    expect(polyglotCyrillic.t('n_votes', 101)).to.equal('101 članak');
    expect(polyglotCyrillic.t('n_votes', 932)).to.equal('932 članka');
    expect(polyglotCyrillic.t('n_votes', 324)).to.equal('324 članka');
    expect(polyglotCyrillic.t('n_votes', 12)).to.equal('12 članaka');
    expect(polyglotCyrillic.t('n_votes', 13)).to.equal('13 članaka');
    expect(polyglotCyrillic.t('n_votes', 14)).to.equal('14 članaka');
    expect(polyglotCyrillic.t('n_votes', 15)).to.equal('15 članaka');
    expect(polyglotCyrillic.t('n_votes', 112)).to.equal('112 članaka');
    expect(polyglotCyrillic.t('n_votes', 113)).to.equal('113 članaka');
    expect(polyglotCyrillic.t('n_votes', 114)).to.equal('114 članaka');
    expect(polyglotCyrillic.t('n_votes', 115)).to.equal('115 članaka');
    expect(polyglotCyrillic.t('n_votes', 0)).to.equal('0 članaka');
  });

  it('pluralizes in Czech', function () {
    // English would be: "1 vote" / "%{smart_count} votes"
    const whatSomeoneTranslated = Object.freeze([
      '%{smart_count} komentář',
      '%{smart_count} komentáře',
      '%{smart_count} komentářů'
    ]);
    const phrases = Object.freeze({
      n_votes: whatSomeoneTranslated.join(' |||| ')
    });

    const polyglot = new Polyglot({ phrases: phrases, locale: 'cs-CZ' });

    expect(polyglot.t('n_votes', 1)).to.equal('1 komentář');
    expect(polyglot.t('n_votes', 2)).to.equal('2 komentáře');
    expect(polyglot.t('n_votes', 3)).to.equal('3 komentáře');
    expect(polyglot.t('n_votes', 4)).to.equal('4 komentáře');
    expect(polyglot.t('n_votes', 0)).to.equal('0 komentářů');
    expect(polyglot.t('n_votes', 11)).to.equal('11 komentářů');
    expect(polyglot.t('n_votes', 12)).to.equal('12 komentářů');
    expect(polyglot.t('n_votes', 16)).to.equal('16 komentářů');
  });

  it('pluralizes in Slovenian', function () {
    // English would be: "1 vote" / "%{smart_count} votes"
    const whatSomeoneTranslated = Object.freeze([
      '%{smart_count} komentar',
      '%{smart_count} komentarja',
      '%{smart_count} komentarji',
      '%{smart_count} komentarjev'
    ]);
    const phrases = Object.freeze({
      n_votes: whatSomeoneTranslated.join(' |||| ')
    });

    const polyglot = new Polyglot({ phrases: phrases, locale: 'sl-SL' });

    [1, 12301, 101, 1001, 201, 301].forEach(function (c) {
      expect(polyglot.t('n_votes', c)).to.equal(c + ' komentar');
    });

    [2, 102, 202, 302].forEach(function (c) {
      expect(polyglot.t('n_votes', c)).to.equal(c + ' komentarja');
    });

    [0, 11, 12, 13, 14, 52, 53].forEach(function (c) {
      expect(polyglot.t('n_votes', c)).to.equal(c + ' komentarjev');
    });
  });

  it('pluralizes in Turkish', function () {
    const whatSomeoneTranslated = Object.freeze([
      'Sepetinizde %{smart_count} X var. Bunu almak istiyor musunuz?',
      'Sepetinizde %{smart_count} X var. Bunları almak istiyor musunuz?'
    ]);
    const phrases = Object.freeze({
      n_x_cart: whatSomeoneTranslated.join(' |||| ')
    });

    const polyglot = new Polyglot({ phrases: phrases, locale: 'tr' });

    expect(polyglot.t('n_x_cart', 1)).to.equal('Sepetinizde 1 X var. Bunu almak istiyor musunuz?');
    expect(polyglot.t('n_x_cart', 2)).to.equal('Sepetinizde 2 X var. Bunları almak istiyor musunuz?');
  });

  it('pluralizes in Lithuanian', function () {
    const whatSomeoneTranslated = Object.freeze([
      '%{smart_count} balsas',
      '%{smart_count} balsai',
      '%{smart_count} balsų'
    ]);
    const phrases = Object.freeze({
      n_votes: whatSomeoneTranslated.join(' |||| ')
    });
    const polyglot = new Polyglot({ phrases: phrases, locale: 'lt' });

    expect(polyglot.t('n_votes', 0)).to.equal('0 balsų');
    expect(polyglot.t('n_votes', 1)).to.equal('1 balsas');
    expect(polyglot.t('n_votes', 2)).to.equal('2 balsai');
    expect(polyglot.t('n_votes', 9)).to.equal('9 balsai');
    expect(polyglot.t('n_votes', 10)).to.equal('10 balsų');
    expect(polyglot.t('n_votes', 11)).to.equal('11 balsų');
    expect(polyglot.t('n_votes', 12)).to.equal('12 balsų');
    expect(polyglot.t('n_votes', 90)).to.equal('90 balsų');
    expect(polyglot.t('n_votes', 91)).to.equal('91 balsas');
    expect(polyglot.t('n_votes', 92)).to.equal('92 balsai');
    expect(polyglot.t('n_votes', 102)).to.equal('102 balsai');
  });
});

describe('custom pluralRules', function () {
  const customPluralRules = Object.freeze({
    pluralTypes: {
      germanLike: function (n) {
        // is 1
        if (n === 1) {
          return 0;
        }
        // everything else
        return 1;
      },
      frenchLike: function (n) {
        // is 0 or 1
        if (n <= 1) {
          return 0;
        }
        // everything else
        return 1;
      }
    },
    pluralTypeToLanguages: {
      germanLike: ['x1'],
      frenchLike: ['x2']
    }
  });

  const testPhrases = Object.freeze({
    test_phrase: '%{smart_count} form zero |||| %{smart_count} form one'
  });

  it('pluralizes in x1', function () {
    const polyglot = new Polyglot({
      phrases: testPhrases,
      locale: 'x1',
      pluralRules: customPluralRules
    });

    expect(polyglot.t('test_phrase', 0)).to.equal('0 form one');
    expect(polyglot.t('test_phrase', 1)).to.equal('1 form zero');
    expect(polyglot.t('test_phrase', 2)).to.equal('2 form one');
  });

  it('pluralizes in x2', function () {
    const polyglot = new Polyglot({
      phrases: testPhrases,
      locale: 'x2',
      pluralRules: customPluralRules
    });

    expect(polyglot.t('test_phrase', 0)).to.equal('0 form zero');
    expect(polyglot.t('test_phrase', 1)).to.equal('1 form zero');
    expect(polyglot.t('test_phrase', 2)).to.equal('2 form one');
  });
});

describe('locale', function () {
  let polyglot;
  beforeEach(function () {
    polyglot = new Polyglot();
  });

  it('defaults to "en"', function () {
    expect(polyglot.locale()).to.equal('en');
  });

  it('gets and sets locale', function () {
    polyglot.locale('es');
    expect(polyglot.locale()).to.equal('es');

    polyglot.locale('fr');
    expect(polyglot.locale()).to.equal('fr');
  });
});

describe('extend', function () {
  let polyglot;
  beforeEach(function () {
    polyglot = new Polyglot();
  });

  it('supports multiple extends, overriding old keys', function () {
    polyglot.extend({ aKey: 'First time' });
    polyglot.extend({ aKey: 'Second time' });
    expect(polyglot.t('aKey')).to.equal('Second time');
  });

  it('does not forget old keys', function () {
    polyglot.extend({ firstKey: 'Numba one', secondKey: 'Numba two' });
    polyglot.extend({ secondKey: 'Numero dos' });
    expect(polyglot.t('firstKey')).to.equal('Numba one');
  });

  it('supports optional `prefix` argument', function () {
    polyglot.extend({ click: 'Click', hover: 'Hover' }, 'sidebar');
    expect(polyglot.phrases['sidebar.click']).to.equal('Click');
    expect(polyglot.phrases['sidebar.hover']).to.equal('Hover');
    expect(polyglot.phrases).not.to.have.property('click');
  });

  it('supports nested object', function () {
    polyglot.extend({
      sidebar: {
        click: 'Click',
        hover: 'Hover'
      },
      nav: {
        header: {
          log_in: 'Log In'
        }
      }
    });
    expect(polyglot.phrases['sidebar.click']).to.equal('Click');
    expect(polyglot.phrases['sidebar.hover']).to.equal('Hover');
    expect(polyglot.phrases['nav.header.log_in']).to.equal('Log In');
    expect(polyglot.phrases).not.to.have.property('click');
    expect(polyglot.phrases).not.to.have.property('header.log_in');
    expect(polyglot.phrases).not.to.have.property('log_in');
  });
});

describe('clear', function () {
  let polyglot;
  beforeEach(function () {
    polyglot = new Polyglot();
  });

  it('wipes out old phrases', function () {
    polyglot.extend({ hiFriend: 'Hi, Friend.' });
    polyglot.clear();
    expect(polyglot.t('hiFriend')).to.equal('hiFriend');
  });
});

describe('replace', function () {
  let polyglot;
  beforeEach(function () {
    polyglot = new Polyglot();
  });

  it('wipes out old phrases and replace with new phrases', function () {
    polyglot.extend({ hiFriend: 'Hi, Friend.', byeFriend: 'Bye, Friend.' });
    polyglot.replace({ hiFriend: 'Hi, Friend.' });
    expect(polyglot.t('hiFriend')).to.equal('Hi, Friend.');
    expect(polyglot.t('byeFriend')).to.equal('byeFriend');
  });
});

describe('unset', function () {
  let polyglot;
  beforeEach(function () {
    polyglot = new Polyglot();
  });

  it('unsets a key based on a string', function () {
    polyglot.extend({ test_key: 'test_value' });
    expect(polyglot.has('test_key')).to.equal(true);

    polyglot.unset('test_key');
    expect(polyglot.has('test_key')).to.equal(false);
  });

  it('unsets a key based on an object hash', function () {
    polyglot.extend({ test_key: 'test_value', foo: 'bar' });
    expect(polyglot.has('test_key')).to.equal(true);
    expect(polyglot.has('foo')).to.equal(true);

    polyglot.unset({ test_key: 'test_value', foo: 'bar' });
    expect(polyglot.has('test_key')).to.equal(false);
    expect(polyglot.has('foo')).to.equal(false);
  });

  it('unsets nested objects using recursive prefix call', function () {
    polyglot.extend({ foo: { bar: 'foobar' } });
    expect(polyglot.has('foo.bar')).to.equal(true);

    polyglot.unset({ foo: { bar: 'foobar' } });
    expect(polyglot.has('foo.bar')).to.equal(false);
  });
});

describe('transformPhrase', function () {
  const simple = '%{name} is %{attribute}';
  const english = '%{smart_count} Name |||| %{smart_count} Names';
  const arabic = [
    'ولا صوت',
    'صوت واحد',
    'صوتان',
    '%{smart_count} أصوات',
    '%{smart_count} صوت',
    '%{smart_count} صوت'
  ].join(' |||| ');

  it('does simple interpolation', function () {
    expect(Polyglot.transformPhrase(simple, { name: 'Polyglot', attribute: 'awesome' })).to.equal('Polyglot is awesome');
  });

  it('removes missing keys', function () {
    expect(Polyglot.transformPhrase(simple, { name: 'Polyglot' })).to.equal('Polyglot is %{attribute}');
  });

  it('selects the correct plural form based on smart_count', function () {
    expect(Polyglot.transformPhrase(english, { smart_count: 0 }, 'en')).to.equal('0 Names');
    expect(Polyglot.transformPhrase(english, { smart_count: 1 }, 'en')).to.equal('1 Name');
    expect(Polyglot.transformPhrase(english, { smart_count: 2 }, 'en')).to.equal('2 Names');
    expect(Polyglot.transformPhrase(english, { smart_count: 3 }, 'en')).to.equal('3 Names');
  });

  it('selects the correct locale', function () {
    // French rule: "0" is singular
    expect(Polyglot.transformPhrase(english, { smart_count: 0 }, 'fr')).to.equal('0 Name');
    expect(Polyglot.transformPhrase(english, { smart_count: 1 }, 'fr')).to.equal('1 Name');
    expect(Polyglot.transformPhrase(english, { smart_count: 2 }, 'fr')).to.equal('2 Names');
    expect(Polyglot.transformPhrase(english, { smart_count: 3 }, 'fr')).to.equal('3 Names');

    // Arabic has 6 rules
    expect(Polyglot.transformPhrase(arabic, 0, 'ar')).to.equal('ولا صوت');
    expect(Polyglot.transformPhrase(arabic, 1, 'ar')).to.equal('صوت واحد');
    expect(Polyglot.transformPhrase(arabic, 2, 'ar')).to.equal('صوتان');
    expect(Polyglot.transformPhrase(arabic, 3, 'ar')).to.equal('3 أصوات');
    expect(Polyglot.transformPhrase(arabic, 11, 'ar')).to.equal('11 صوت');
    expect(Polyglot.transformPhrase(arabic, 102, 'ar')).to.equal('102 صوت');
  });

  it('defaults to `en`', function () {
    // French rule: "0" is singular
    expect(Polyglot.transformPhrase(english, { smart_count: 0 })).to.equal('0 Names');
  });

  it('ignores a region subtag when choosing a pluralization rule', function () {
    // French rule: "0" is singular
    expect(Polyglot.transformPhrase(english, { smart_count: 0 }, 'fr-FR')).to.equal('0 Name');
  });

  it('works without arguments', function () {
    expect(Polyglot.transformPhrase(english)).to.equal(english);
  });

  it('respects a number as shortcut for smart_count', function () {
    expect(Polyglot.transformPhrase(english, 0, 'en')).to.equal('0 Names');
    expect(Polyglot.transformPhrase(english, 1, 'en')).to.equal('1 Name');
    expect(Polyglot.transformPhrase(english, 5, 'en')).to.equal('5 Names');
  });

  it('throws without sane phrase string', function () {
    expect(function () { Polyglot.transformPhrase(); }).to.throw(TypeError);
    expect(function () { Polyglot.transformPhrase(null); }).to.throw(TypeError);
    expect(function () { Polyglot.transformPhrase(32); }).to.throw(TypeError);
    expect(function () { Polyglot.transformPhrase({}); }).to.throw(TypeError);
  });
});
