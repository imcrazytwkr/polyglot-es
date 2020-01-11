//     (c) 2012-2018 Airbnb, Inc.
//
//     polyglot.js may be freely distributed under the terms of the BSD
//     license. For all licensing information, details, and documention:
//     http://airbnb.github.com/polyglot.js
//
//
// Polyglot.js is an I18n helper library written in JavaScript, made to
// work both in the browser and in Node. It provides a simple solution for
// interpolation and pluralization, based off of Airbnb's
// experience adding I18n functionality to its Backbone.js and Node apps.
//
// Polylglot is agnostic to your translation backend. It doesn't perform any
// translation; it simply gives you a way to manage translated phrases from
// your client- or server-side JavaScript application.
//
const noop = () => undefined;

// #### Pluralization methods
// The string that separates the different phrase possibilities.
const delimiter = '||||';

function arabicPluralGroups(n) {
  // http://www.arabeyes.org/Plural_Forms
  if (n < 3) return n;

  const lastTwo = n % 100;
  if (lastTwo >= 3 && lastTwo <= 10) return 3;
  return (lastTwo >= 11) ? 4 : 5;
}

function chinesePluralGroups() {
  return 0;
}

function czechPluralGroups(n) {
  if (n === 1) return 0;
  return (n >= 2 && n <= 4) ? 1 : 2;
}

function frenchPluralGroups(n) {
  return (n > 1) ? 1 : 0;
}

function germanPluralGroups(n) {
  return (n === 1) ? 0 : 1;
}

function icelandicPluralGroups(n) {
  return (n % 10 !== 1 || n % 100 === 11) ? 1 : 0;
}

function lithuanianPluralGroups(n) {
  const lastTwo = n % 100;
  const lastOne = lastTwo % 10;
  if (lastOne === 1 && lastTwo !== 11) return 0;
  return (lastOne >= 2 && lastOne <= 9 && (lastTwo < 11 || lastTwo > 19)) ? 1 : 2;
}

function polistPluralGroups(n) {
  if (n === 1) return 0;
  const lastTwo = n % 100;
  const lastOne = lastTwo % 10;
  return (lastOne >= 2 && lastOne <= 4 && (lastTwo < 10 || lastTwo >= 20)) ? 1 : 2;
}

function russianPluralGroups(n) {
  const lastTwo = n % 100;
  const lastOne = lastTwo % 10;
  if (lastTwo !== 11 && lastOne === 1) return 0;
  return (lastOne >= 2 && lastOne <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) ? 1 : 2;
}

function slovenianPluralGroups(n) {
  switch (n % 100) {
    case 1:
      return 0;
    case 2:
      return 1;
    case 3:
    case 4:
      return 2;
    default:
      return 3;
  }
}

const defaultPluralRules = Object.freeze({
  // Mapping from pluralization group plural logic.
  pluralTypes: {
    arabic: arabicPluralGroups,
    bosnian_serbian: russianPluralGroups,
    chinese: chinesePluralGroups,
    czech: czechPluralGroups,
    croatian: russianPluralGroups,
    french: frenchPluralGroups,
    german: germanPluralGroups,
    icelandic: icelandicPluralGroups,
    lithuanian: lithuanianPluralGroups,
    polish: polistPluralGroups,
    russian: russianPluralGroups,
    slovenian: slovenianPluralGroups,
  },

  // Mapping from pluralization group to individual language codes/locales.
  // Will look up based on exact match, if not found and it's a locale will parse the locale
  // for language code, and if that does not exist will default to 'en'
  pluralTypeToLanguages: {
    arabic: ['ar'],
    bosnian_serbian: ['bs-Latn-BA', 'bs-Cyrl-BA', 'srl-RS', 'sr-RS'],
    chinese: ['id', 'id-ID', 'ja', 'ko', 'ko-KR', 'lo', 'ms', 'th', 'th-TH', 'zh'],
    croatian: ['hr', 'hr-HR'],
    german: [
      'fa',
      'da',
      'de',
      'en',
      'es',
      'fi',
      'el',
      'he',
      'hi-IN',
      'hu',
      'hu-HU',
      'it',
      'nl',
      'no',
      'pt',
      'sv',
      'tr',
    ],
    french: ['fr', 'tl', 'pt-br'],
    russian: ['ru', 'ru-RU'],
    lithuanian: ['lt'],
    czech: ['cs', 'cs-CZ', 'sk'],
    polish: ['pl'],
    icelandic: ['is'],
    slovenian: ['sl-SL'],
  },
});

function accumulateToTypeMap(accumulator, [type, langs]) {
  // @NOTE: filter by boolean is added to trim all empty and undefined (from trailing commas
  // in multi-line arrays, for example) values
  return (langs.length > 0) ? langs.filter(Boolean).reduce((acc, lang) => {
    acc[lang] = type;
    return acc;
  }, accumulator) : accumulator;
}

function langToTypeMap(mapping) {
  return Object.entries(mapping).reduce(accumulateToTypeMap, {});
}

function pluralTypeName(pluralRules, locale) {
  const langToPluralType = langToTypeMap(pluralRules.pluralTypeToLanguages);
  return langToPluralType[locale]
    || langToPluralType[locale.split(/-/, 1)[0]]
    || langToPluralType.en;
}

function pluralTypeIndex(pluralRules, locale, count) {
  return pluralRules.pluralTypes[pluralTypeName(pluralRules, locale)](count);
}

function escape(token) {
  return token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function constructTokenRegex(options = {}) {
  const { prefix = '%{', suffix = '}' } = options;

  if (prefix === delimiter || suffix === delimiter) {
    throw new RangeError(`"${delimiter}" token is reserved for pluralization`);
  }

  return new RegExp(`${escape(prefix)}(.*?)${escape(suffix)}`, 'g');
}

const defaultTokenRegex = /%\{(.*?)\}/g;

class Polyglot {
  // ### Polyglot class constructor
  constructor(options = {}) {
    this.phrases = {};
    this.extend(options.phrases || {});
    this.currentLocale = options.locale || 'en';
    const allowMissing = options.allowMissing ? Polyglot.transformPhrase : null;
    const { onMissingKey } = options;
    this.onMissingKey = typeof onMissingKey === 'function' ? onMissingKey : allowMissing;
    this.warn = options.warn || noop;
    this.tokenRegex = constructTokenRegex(options.interpolation);
    this.pluralRules = options.pluralRules || defaultPluralRules;
  }

  // ### Polyglot#locale([locale])
  //
  // Get or set locale. Internally, Polyglot only uses locale for pluralization.
  locale(newLocale) {
    if (newLocale) this.currentLocale = newLocale;
    return this.currentLocale;
  }

  // ### Polyglot#extend(phrases)
  //
  // Use `extend` to tell Polyglot how to translate a given key.
  //
  //     polyglot.extend({
  //       "hello": "Hello",
  //       "hello_name": "Hello, %{name}"
  //     });
  //
  // The key can be any string.  Feel free to call `extend` multiple times;
  // it will override any phrases with the same key, but leave existing phrases
  // untouched.
  //
  // It is also possible to pass nested phrase objects, which get flattened
  // into an object with the nested keys concatenated using dot notation.
  //
  //     polyglot.extend({
  //       "nav": {
  //         "hello": "Hello",
  //         "hello_name": "Hello, %{name}",
  //         "sidebar": {
  //           "welcome": "Welcome"
  //         }
  //       }
  //     });
  //
  //     console.log(polyglot.phrases);
  //     // {
  //     //   'nav.hello': 'Hello',
  //     //   'nav.hello_name': 'Hello, %{name}',
  //     //   'nav.sidebar.welcome': 'Welcome'
  //     // }
  //
  // `extend` accepts an optional second argument, `prefix`, which can be used
  // to prefix every key in the phrases object with some string, using dot
  // notation.
  //
  //     polyglot.extend({
  //       "hello": "Hello",
  //       "hello_name": "Hello, %{name}"
  //     }, "nav");
  //
  //     console.log(polyglot.phrases);
  //     // {
  //     //   'nav.hello': 'Hello',
  //     //   'nav.hello_name': 'Hello, %{name}'
  //     // }
  //
  // This feature is used internally to support nested phrase objects.
  extend(morePhrases, prefix) {
    Object.entries(morePhrases).forEach(([key, phrase]) => {
      const prefixedKey = prefix ? `${prefix}.${key}` : key;
      if (typeof phrase === 'object') {
        this.extend(phrase, prefixedKey);
        return;
      }

      this.phrases[prefixedKey] = phrase;
    }, this);
  }

  // ### Polyglot#unset(phrases)
  // Use `unset` to selectively remove keys from a polyglot instance.
  //
  //     polyglot.unset("some_key");
  //     polyglot.unset({
  //       "hello": "Hello",
  //       "hello_name": "Hello, %{name}"
  //     });
  //
  // The unset method can take either a string (for the key), or an object hash with
  // the keys that you would like to unset.
  unset(morePhrases, prefix) {
    if (typeof morePhrases === 'string') {
      delete this.phrases[morePhrases];
      return;
    }

    Object.entries(morePhrases).forEach(([key, phrase]) => {
      const prefixedKey = prefix ? `${prefix}.${key}` : key;
      if (typeof phrase === 'object') {
        this.unset(phrase, prefixedKey);
        return;
      }

      delete this.phrases[prefixedKey];
    }, this);
  }

  // ### Polyglot#clear()
  //
  // Clears all phrases. Useful for special cases, such as freeing
  // up memory if you have lots of phrases but no longer need to
  // perform any translation. Also used internally by `replace`.
  clear() {
    this.phrases = {};
  }

  // ### Polyglot#replace(phrases)
  //
  // Completely replace the existing phrases with a new set of phrases.
  // Normally, just use `extend` to add more phrases, but under certain
  // circumstances, you may want to make sure no old phrases are lying around.
  replace(newPhrases) {
    this.clear();
    this.extend(newPhrases);
  }

  // ### Polyglot#t(key, options)
  //
  // The most-used method. Provide a key, and `t` will return the
  // phrase.
  //
  //     polyglot.t("hello");
  //     => "Hello"
  //
  // The phrase value is provided first by a call to `polyglot.extend()` or
  // `polyglot.replace()`.
  //
  // Pass in an object as the second argument to perform interpolation.
  //
  //     polyglot.t("hello_name", {name: "Spike"});
  //     => "Hello, Spike"
  //
  // If you like, you can provide a default value in case the phrase is missing.
  // Use the special option key "_" to specify a default.
  //
  //     polyglot.t("i_like_to_write_in_language", {
  //       _: "I like to write in %{language}.",
  //       language: "JavaScript"
  //     });
  //     => "I like to write in JavaScript."
  //
  t(key, options = {}) {
    let phrase;
    let result;

    if (typeof this.phrases[key] === 'string') {
      phrase = this.phrases[key];
    } else if (typeof options._ === 'string') {
      phrase = options._;
    } else if (this.onMissingKey) {
      result = this.onMissingKey(
        key,
        options,
        this.currentLocale,
        this.tokenRegex,
        this.pluralRules,
      );
    } else {
      this.warn(`Missing translation for key: "${key}"`);
      result = key;
    }

    if (typeof phrase === 'string') {
      result = Polyglot.transformPhrase(
        phrase,
        options,
        this.currentLocale,
        this.tokenRegex,
        this.pluralRules,
      );
    }

    return result;
  }

  // ### Polyglot#has(key)
  //
  // Check if polyglot has a translation for given key
  has(key) {
    return Boolean(this.phrases[key]);
  }

  // ### Polyglot.transformPhrase(phrase, substitutions, locale)
  //
  // Takes a phrase string and transforms it by choosing the correct
  // plural form and interpolating it.
  //
  //     transformPhrase('Hello, %{name}!', {name: 'Spike'});
  //     // "Hello, Spike!"
  //
  // The correct plural form is selected if substitutions.smart_count
  // is set. You can pass in a number instead of an Object as `substitutions`
  // as a shortcut for `smart_count`.
  //
  //     transformPhrase('%{smart_count} new messages |||| 1 new message', {smart_count: 1}, 'en');
  //     // "1 new message"
  //
  //     transformPhrase('%{smart_count} new messages |||| 1 new message', {smart_count: 2}, 'en');
  //     // "2 new messages"
  //
  //     transformPhrase('%{smart_count} new messages |||| 1 new message', 5, 'en');
  //     // "5 new messages"
  //
  // You should pass in a third argument, the locale, to specify the correct plural type.
  // It defaults to `'en'` with 2 plural forms.
  static transformPhrase(
    phrase,
    substitutions,
    locale = 'en',
    tokenRegex = defaultTokenRegex,
    pluralRules = defaultPluralRules,
  ) {
    if (typeof phrase !== 'string') {
      throw new TypeError('Polyglot.transformPhrase expects argument #1 to be string');
    }

    if (typeof substitutions === 'undefined') return phrase;

    let result = phrase;

    // allow number as a pluralization shortcut
    const options = (typeof substitutions === 'number') ? {
      smart_count: substitutions,
    } : substitutions;
    const smartCount = options.smart_count;

    // Select plural form: based on a phrase text that contains `n`
    // plural forms separated by `delimiter`, a `locale`, and a `substitutions.smart_count`,
    // choose the correct plural form. This is only done if `count` is set.
    if (typeof smartCount === 'number' && result) {
      const texts = result.split(delimiter);
      result = (texts[pluralTypeIndex(pluralRules, locale, smartCount)] || texts[0]).trim();
    }

    // Interpolate: Creates a `RegExp` object for each interpolation placeholder.
    const replacer = (expression, argument) => {
      const replacement = options[argument];
      return (typeof replacement === 'undefined') ? expression : replacement;
    };

    return result.replace(tokenRegex, replacer);
  }
}

module.exports = Polyglot;
