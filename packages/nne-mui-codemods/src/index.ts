import adapterv4 from './v5.0.0/adapter-v4.js';
import buttoncolorprop from './v5.0.0/button-color-prop.js';
import emotionprependcache from './v5.0.0/emotion-prepend-cache.js';
import linkunderlinehover from './v5.0.0/link-underline-hover.js';
import skeletonvariant from './v5.0.0/skeleton-variant.js';
import themeprovider from './v5.0.0/theme-provider.js';
import autocompleterenamecloseicon from './v5.0.0/autocomplete-rename-closeicon.js';
import chipvariantprop from './v5.0.0/chip-variant-prop.js';
import expansionpanelcomponent from './v5.0.0/expansion-panel-component.js';
import materialuistyles from './v5.0.0/material-ui-styles.js';
import styledengineprovider from './v5.0.0/styled-engine-provider.js';
import themespacing from './v5.0.0/theme-spacing.js';
import autocompleterenameoption from './v5.0.0/autocomplete-rename-option.js';
import circularprogressvariant from './v5.0.0/circularprogress-variant.js';
import fabvariant from './v5.0.0/fab-variant.js';
import materialuitypes from './v5.0.0/material-ui-types.js';
import tableprops from './v5.0.0/table-props.js';
import themetypographyround from './v5.0.0/theme-typography-round.js';
import avatarcirclecircular from './v5.0.0/avatar-circle-circular.js';
import collapserenamecollapsedheight from './v5.0.0/collapse-rename-collapsedheight.js';
import faderenamealpha from './v5.0.0/fade-rename-alpha.js';
import modalprops from './v5.0.0/modal-props.js';
import tabscrollbuttons from './v5.0.0/tabs-scroll-buttons.js';
import toplevelimports from './v5.0.0/top-level-imports.js';
import badgeoverlapvalue from './v5.0.0/badge-overlap-value.js';
import componentrenameprop from './v5.0.0/component-rename-prop.js';
import gridjustifyjustifycontent from './v5.0.0/grid-justify-justifycontent.js';
import movedlabmodules from './v5.0.0/moved-lab-modules.js';
import textareaminmaxrows from './v5.0.0/textarea-minmax-rows.js';
import transitions from './v5.0.0/transitions.js';
import baserenamecomponentstoslots from './v5.0.0/base-rename-components-to-slots.js';
import corestylesimport from './v5.0.0/core-styles-import.js';
import gridlistcomponent from './v5.0.0/grid-list-component.js';
import muireplace from './v5.0.0/mui-replace.js';
import themeaugment from './v5.0.0/theme-augment.js';
import useautocomplete from './v5.0.0/use-autocomplete.js';
import boxborderradiusvalues from './v5.0.0/box-borderradius-values.js';
import createtheme from './v5.0.0/create-theme.js';
import hiddendownprops from './v5.0.0/hidden-down-props.js';
import optimalimports from './v5.0.0/optimal-imports.js';
import themebreakpoints from './v5.0.0/theme-breakpoints.js';
import usetransitionprops from './v5.0.0/use-transitionprops.js';
import boxrenamecss from './v5.0.0/box-rename-css.js';
import datepickersmovedtox from './v5.0.0/date-pickers-moved-to-x.js';
import iconbuttonsize from './v5.0.0/icon-button-size.js';
import paginationroundcircular from './v5.0.0/pagination-round-circular.js';
import themebreakpointswidth from './v5.0.0/theme-breakpoints-width.js';
import variantprop from './v5.0.0/variant-prop.js';
import boxrenamegap from './v5.0.0/box-rename-gap.js';
import dialogprops from './v5.0.0/dialog-props.js';
import jsstostyled from './v5.0.0/jss-to-styled.js';
import presetsafe from './v5.0.0/preset-safe.js';
import themeoptions from './v5.0.0/theme-options.js';
import withmobiledialog from './v5.0.0/with-mobile-dialog.js';
import boxsxprop from './v5.0.0/box-sx-prop.js';
import dialogtitleprops from './v5.0.0/dialog-title-props.js';
import jsstotssreact from './v5.0.0/jss-to-tss-react.js';
import rootref from './v5.0.0/root-ref.js';
import themepalettemode from './v5.0.0/theme-palette-mode.js';
import withwidth from './v5.0.0/with-width.js';

type Codemod = {
	engine: 'jscodeshift';
	caseTitle: string;
	// eslint-disable-next-line @typescript-eslint/ban-types
	transformer: Function;
	withParser: 'tsx';
};

export const codemods: ReadonlyArray<Codemod> = [
	{
		engine: 'jscodeshift',
		caseTitle: 'MUI: adapter v4',
		transformer: adapterv4,

		withParser: 'tsx',
	},
	{
		engine: 'jscodeshift',
		caseTitle: 'MUI: button color prop',
		transformer: buttoncolorprop,

		withParser: 'tsx',
	},
	{
		engine: 'jscodeshift',
		caseTitle: 'MUI: emotion prepend cache',
		transformer: emotionprependcache,

		withParser: 'tsx',
	},
	{
		engine: 'jscodeshift',
		caseTitle: 'MUI: link underline hover',
		transformer: linkunderlinehover,

		withParser: 'tsx',
	},
	{
		engine: 'jscodeshift',
		caseTitle: 'MUI: skeleton variant',
		transformer: skeletonvariant,

		withParser: 'tsx',
	},
	{
		engine: 'jscodeshift',
		caseTitle: 'MUI: theme provider',
		transformer: themeprovider,

		withParser: 'tsx',
	},
	{
		engine: 'jscodeshift',
		caseTitle: 'MUI: autocompleterename close icon',
		transformer: autocompleterenamecloseicon,

		withParser: 'tsx',
	},
	{
		engine: 'jscodeshift',
		caseTitle: 'MUI: chip variant prop',
		transformer: chipvariantprop,

		withParser: 'tsx',
	},
	{
		engine: 'jscodeshift',
		caseTitle: 'MUI: expansion panel component',
		transformer: expansionpanelcomponent,

		withParser: 'tsx',
	},
	{
		engine: 'jscodeshift',
		caseTitle: 'MUI: Material UI styles',
		transformer: materialuistyles,

		withParser: 'tsx',
	},
	{
		engine: 'jscodeshift',
		caseTitle: 'MUI: styled engine provider',
		transformer: styledengineprovider,

		withParser: 'tsx',
	},
	{
		engine: 'jscodeshift',
		caseTitle: 'MUI: theme spacing',
		transformer: themespacing,

		withParser: 'tsx',
	},
	{
		engine: 'jscodeshift',
		caseTitle: 'MUI: autocomplete rename option',
		transformer: autocompleterenameoption,

		withParser: 'tsx',
	},
	{
		engine: 'jscodeshift',
		caseTitle: 'MUI: circular progress variant',
		transformer: circularprogressvariant,

		withParser: 'tsx',
	},
	{
		engine: 'jscodeshift',
		caseTitle: 'MUI: fab variant',
		transformer: fabvariant,

		withParser: 'tsx',
	},
	{
		engine: 'jscodeshift',
		caseTitle: 'MUI: Material UI types',
		transformer: materialuitypes,

		withParser: 'tsx',
	},
	{
		engine: 'jscodeshift',
		caseTitle: 'MUI: table props',
		transformer: tableprops,

		withParser: 'tsx',
	},
	{
		engine: 'jscodeshift',
		caseTitle: 'MUI: themetypographyround',
		transformer: themetypographyround,

		withParser: 'tsx',
	},
	{
		engine: 'jscodeshift',
		caseTitle: 'MUI: avatar circle circular',
		transformer: avatarcirclecircular,

		withParser: 'tsx',
	},
	{
		engine: 'jscodeshift',
		caseTitle: 'MUI: collapse rename collapsed height',
		transformer: collapserenamecollapsedheight,

		withParser: 'tsx',
	},
	{
		engine: 'jscodeshift',
		caseTitle: 'MUI: fade rename alpha',
		transformer: faderenamealpha,

		withParser: 'tsx',
	},
	{
		engine: 'jscodeshift',
		caseTitle: 'MUI: modal props',
		transformer: modalprops,

		withParser: 'tsx',
	},
	{
		engine: 'jscodeshift',
		caseTitle: 'MUI: tab scroll buttons',
		transformer: tabscrollbuttons,

		withParser: 'tsx',
	},
	{
		engine: 'jscodeshift',
		caseTitle: 'MUI: top level imports',
		transformer: toplevelimports,

		withParser: 'tsx',
	},
	{
		engine: 'jscodeshift',
		caseTitle: 'MUI: badge overlap value',
		transformer: badgeoverlapvalue,

		withParser: 'tsx',
	},
	{
		engine: 'jscodeshift',
		caseTitle: 'MUI: component rename prop',
		transformer: componentrenameprop,

		withParser: 'tsx',
	},
	{
		engine: 'jscodeshift',
		caseTitle: 'MUI: grid justify justify content',
		transformer: gridjustifyjustifycontent,

		withParser: 'tsx',
	},
	{
		engine: 'jscodeshift',
		caseTitle: 'MUI: movedlabmodules',
		transformer: movedlabmodules,

		withParser: 'tsx',
	},
	{
		engine: 'jscodeshift',
		caseTitle: 'MUI: text area min max rows',
		transformer: textareaminmaxrows,

		withParser: 'tsx',
	},
	{
		engine: 'jscodeshift',
		caseTitle: 'MUI: transitions',
		transformer: transitions,

		withParser: 'tsx',
	},
	{
		engine: 'jscodeshift',
		caseTitle: 'MUI: base rename components to slots',
		transformer: baserenamecomponentstoslots,

		withParser: 'tsx',
	},
	{
		engine: 'jscodeshift',
		caseTitle: 'MUI: core styles import',
		transformer: corestylesimport,

		withParser: 'tsx',
	},
	{
		engine: 'jscodeshift',
		caseTitle: 'MUI: grid list component',
		transformer: gridlistcomponent,

		withParser: 'tsx',
	},
	{
		engine: 'jscodeshift',
		caseTitle: 'MUI: replace',
		transformer: muireplace,

		withParser: 'tsx',
	},
	{
		engine: 'jscodeshift',
		caseTitle: 'MUI: theme augment',
		transformer: themeaugment,

		withParser: 'tsx',
	},
	{
		engine: 'jscodeshift',
		caseTitle: 'MUI: use auto complete',
		transformer: useautocomplete,

		withParser: 'tsx',
	},
	{
		engine: 'jscodeshift',
		caseTitle: 'MUI: box border radius values',
		transformer: boxborderradiusvalues,

		withParser: 'tsx',
	},
	{
		engine: 'jscodeshift',
		caseTitle: 'MUI: create theme',
		transformer: createtheme,

		withParser: 'tsx',
	},
	{
		engine: 'jscodeshift',
		caseTitle: 'MUI: hidden down props',
		transformer: hiddendownprops,

		withParser: 'tsx',
	},
	{
		engine: 'jscodeshift',
		caseTitle: 'MUI: optimal imports',
		transformer: optimalimports,

		withParser: 'tsx',
	},
	{
		engine: 'jscodeshift',
		caseTitle: 'MUI: theme breakpoints',
		transformer: themebreakpoints,

		withParser: 'tsx',
	},
	{
		engine: 'jscodeshift',
		caseTitle: 'MUI: use transition props',
		transformer: usetransitionprops,

		withParser: 'tsx',
	},
	{
		engine: 'jscodeshift',
		caseTitle: 'MUI: boxrenamecss',
		transformer: boxrenamecss,

		withParser: 'tsx',
	},
	{
		engine: 'jscodeshift',
		caseTitle: 'MUI: date pickers moved to x',
		transformer: datepickersmovedtox,

		withParser: 'tsx',
	},
	{
		engine: 'jscodeshift',
		caseTitle: 'MUI: icon button size',
		transformer: iconbuttonsize,

		withParser: 'tsx',
	},
	{
		engine: 'jscodeshift',
		caseTitle: 'MUI: pagination round circular',
		transformer: paginationroundcircular,

		withParser: 'tsx',
	},
	{
		engine: 'jscodeshift',
		caseTitle: 'MUI: theme breakpoints width',
		transformer: themebreakpointswidth,

		withParser: 'tsx',
	},
	{
		engine: 'jscodeshift',
		caseTitle: 'MUI: variant prop',
		transformer: variantprop,

		withParser: 'tsx',
	},
	{
		engine: 'jscodeshift',
		caseTitle: 'MUI: box rename gap',
		transformer: boxrenamegap,

		withParser: 'tsx',
	},
	{
		engine: 'jscodeshift',
		caseTitle: 'MUI: dialog props',
		transformer: dialogprops,

		withParser: 'tsx',
	},
	{
		engine: 'jscodeshift',
		caseTitle: 'MUI: jss to styled',
		transformer: jsstostyled,

		withParser: 'tsx',
	},
	{
		engine: 'jscodeshift',
		caseTitle: 'MUI: preset safe',
		transformer: presetsafe,

		withParser: 'tsx',
	},
	{
		engine: 'jscodeshift',
		caseTitle: 'MUI: theme options',
		transformer: themeoptions,

		withParser: 'tsx',
	},
	{
		engine: 'jscodeshift',
		caseTitle: 'MUI: with mobile dialog',
		transformer: withmobiledialog,

		withParser: 'tsx',
	},
	{
		engine: 'jscodeshift',
		caseTitle: 'MUI: box sx prop',
		transformer: boxsxprop,

		withParser: 'tsx',
	},
	{
		engine: 'jscodeshift',
		caseTitle: 'MUI: dialog title props',
		transformer: dialogtitleprops,

		withParser: 'tsx',
	},
	{
		engine: 'jscodeshift',
		caseTitle: 'MUI: jss to tss react',
		transformer: jsstotssreact,

		withParser: 'tsx',
	},
	{
		engine: 'jscodeshift',
		caseTitle: 'MUI: root ref',
		transformer: rootref,

		withParser: 'tsx',
	},
	{
		engine: 'jscodeshift',
		caseTitle: 'MUI: theme palette mode',
		transformer: themepalettemode,

		withParser: 'tsx',
	},
	{
		engine: 'jscodeshift',
		caseTitle: 'MUI: with width',
		transformer: withwidth,

		withParser: 'tsx',
	},
];
