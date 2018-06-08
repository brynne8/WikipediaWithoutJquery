# WikipediaWithoutJquery
We are able to use Wikipedia without jQuery

## How to use Wikipedia jQuery-free
I assume you have an addon for blocking ads, i.e. Adblock, uBlock etc. Add a rule like this:
```
*&modules=jquery*
```
This will prevent jQuery from loading on Wikipedia.

But we will face with some small problems. Like using gadgets and wikitext editor. But with jQuery disabled, we will find a lot of fxxking modules are not loaded, that what we are happy to see.

According to [this MediaWiki page](https://www.mediawiki.org/wiki/JQuery), Wikipedia now uses ResourceLoader everywhere, so how could we work without it?

## Why we remove jQuery
First, let's have a look at
* https://github.com/nefe/You-Dont-Need-jQuery
* http://youmightnotneedjquery.com/

jQuery is an old library that considers many things like backward compatibility. But people like me hates wasting time by those polyfills. That's the reason I favor the implementation in [simplequery](https://github.com/AlexanderMisel/simplequery).

## Using our own scripts
Without jQuery, the ResourceLoader couldn't work, thus the js defined in our own common.js or global.js couldn't work as well. So we'll use other options to inject our own scripts. My choice is [tampermonkey](http://tampermonkey.net/).

Originally, I tried to use Greasemonkey, but it seems not working well with uBlock. Tampermonkey is a fine addon, compatible with Greasemonkey js format, and has localisations and better user interface.

The first two scripts I want to add are:
* simplequery (adds $ function support, even though not globally)
* wikEd (our fallback editor)
