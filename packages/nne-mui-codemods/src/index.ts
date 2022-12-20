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

const transformers = {
    adapterv4,
    buttoncolorprop,
    emotionprependcache,
    linkunderlinehover,
    skeletonvariant,
    themeprovider,
    autocompleterenamecloseicon,
    chipvariantprop,
    expansionpanelcomponent,
    materialuistyles,
    styledengineprovider,
    themespacing,
    autocompleterenameoption,
    circularprogressvariant,
    fabvariant,
    materialuitypes,
    tableprops,
    themetypographyround,
    avatarcirclecircular,
    collapserenamecollapsedheight,
    faderenamealpha,
    modalprops,
    tabscrollbuttons,
    toplevelimports,
    badgeoverlapvalue,
    componentrenameprop,
    gridjustifyjustifycontent,
    movedlabmodules,
    textareaminmaxrows,
    transitions,
    baserenamecomponentstoslots,
    corestylesimport,
    gridlistcomponent,
    muireplace,
    themeaugment,
    useautocomplete,
    boxborderradiusvalues,
    createtheme,
    hiddendownprops,
    optimalimports,
    themebreakpoints,
    usetransitionprops,
    boxrenamecss,
    datepickersmovedtox,
    iconbuttonsize,
    paginationroundcircular,
    themebreakpointswidth,
    variantprop,
    boxrenamegap,
    dialogprops,
    jsstostyled,
    presetsafe,
    themeoptions,
    withmobiledialog,
    boxsxprop,
    dialogtitleprops,
    jsstotssreact,
    rootref,
    themepalettemode,
    withwidth,
};

type Codemod = {
    caseTitle: string,
    group: "mui",
    transformer: Function,
    withParser: "tsx",
};

export const codemods: ReadonlyArray<Codemod> = [
    {
        caseTitle: "MUI: adapter v4",
        transformer: adapterv4,
        group: "mui",
        withParser: "tsx",
    },
    {
        caseTitle: "MUI: button color prop",
        transformer: buttoncolorprop,
        group: "mui",
        withParser: "tsx",
    },
    {
        caseTitle: "MUI: emotion prepend cache",
        transformer: emotionprependcache,
        group: "mui",
        withParser: "tsx",
    },
    {
        caseTitle: "MUI: link underline hover",
        transformer: linkunderlinehover,
        group: "mui",
        withParser: "tsx",
    },
    {
        caseTitle: "MUI: skeleton variant",
        transformer: skeletonvariant,
        group: "mui",
        withParser: "tsx",
    },
    {
        caseTitle: "MUI: theme provider",
        transformer: themeprovider,
        group: "mui",
        withParser: "tsx",
    },
    {
        caseTitle: "MUI: autocompleterename close icon",
        transformer: autocompleterenamecloseicon,
        group: "mui",
        withParser: "tsx",
    },
    {
        caseTitle: "MUI: chip variant prop",
        transformer: chipvariantprop,
        group: "mui",
        withParser: "tsx",
    },
    {
        caseTitle: "MUI: expansion panel component",
        transformer: expansionpanelcomponent,
        group: "mui",
        withParser: "tsx",
    },
    {
        caseTitle: "MUI: Material UI styles",
        transformer: materialuistyles,
        group: "mui",
        withParser: "tsx",
    },
    {
        caseTitle: "MUI: styled engine provider",
        transformer: styledengineprovider,
        group: "mui",
        withParser: "tsx",
    },
    {
        caseTitle: "MUI: theme spacing",
        transformer: themespacing,
        group: "mui",
        withParser: "tsx",
    },
    {
        caseTitle: "MUI: autocomplete rename option",
        transformer: autocompleterenameoption,
        group: "mui",
        withParser: "tsx",
    },
    {
        caseTitle: "MUI: circular progress variant",
        transformer: circularprogressvariant,
        group: "mui",
        withParser: "tsx",
    },
    {
        caseTitle: "MUI: fab variant",
        transformer: fabvariant,
        group: "mui",
        withParser: "tsx",
    },
];