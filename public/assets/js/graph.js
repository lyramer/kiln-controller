import { timeTickFormatter } from "./helpers.js"

export const graphInit = {
    profile: {
        label: "Profile",
        data: [],
        points: { show: false },
        color: "#75890c",
        draggable: false
    },
    firing: {
        label: "Current Firing",
        data: [],
        points: { show: false },
        color: "#d8d3c5",
        draggable: false
    }
};




const fontOptions = {
    size: 14,
    lineHeight: 14,
    weight: "normal",
    family: "Digi",
    variant: "small-caps"
};

const colors = {
    paleGray: 'rgba(216, 211, 197, 0.2)',
    lightGray: 'rgba(216, 211, 197, 0.55)',
    midGray: 'rgba(216, 211, 197, 0.85)'
}

export const graphOptions = {
    series: {
        lines: { show: true },
        points: {
            show: true,
            radius: 5,
            symbol: "circle"
        },
        shadowSize: 3
    },

	xaxis: {
      min: 0,
      tickColor: colors.paleGray,
      tickFormatter: timeTickFormatter,
      font: {
        ...fontOptions,
        color: colors.midGray
      }
	},

	yaxis: {
      min: 0,
      tickDecimals: 0,
      draggable: false,
      tickColor: colors.paleGray,
      font: {
        ...fontOptions,
        color: colors.midGray
      }
	},

	grid: {
	  color: colors.lightGray,
      borderWidth: 1,
      labelMargin: 10,
      mouseActiveRadius: 50
	},

    legend:{ show: false }
};

export function updateGraph(graph) {
    return $.plot("#graph_container", [ graph.profile, graph.firing ] , graphOptions);
}


export function populateProfileGraph(graph, config, curProfile) {

    graph.profile.data = curProfile.graphData

    $('#sel_prof').html(curProfile.name);
    $('#sel_prof_eta').html(curProfile.jobTime);
    $('#sel_prof_cost').html(`${curProfile.kwh} kWh (${config.currencyType}: ${curProfile.cost})`);
    
    graph.plot = updateGraph(graph)

    return graph;
}

