queue()
    .defer(d3.json, "/api/data")
    .defer(d3.json, "geojson/us-states.json")
    .await(makeGraphs);

function makeGraphs(error, apiData, statesJson) {

//Start Transformations
	var dataSet = apiData;
	var dateFormat = d3.time.format("%Y-%m-%d %H:%M:%S");
	dataSet.forEach(function(d) {
		d.date_posted = dateFormat.parse(d.date_posted);
		d.date_posted.setDate(1);
		d.total_donations = +d.total_donations;
	});

	//Create a Crossfilter instance
	var ndx = crossfilter(dataSet);

	//Define Dimensions
	var datePosted = ndx.dimension(function(d) { return d.date_posted; });
	var gradeLevel = ndx.dimension(function(d) { return d.grade_level; });
	var resourceType = ndx.dimension(function(d) { return d.resource_type; });
	var fundingStatus = ndx.dimension(function(d) { return d.funding_status; });
	var povertyLevel = ndx.dimension(function(d) { return d.poverty_level; });
	var state = ndx.dimension(function(d) { return d.school_state; });
	var totalDonations  = ndx.dimension(function(d) { return d.total_donations; });


	//Calculate metrics
	var projectsByDate = datePosted.group();
	var projectsByGrade = gradeLevel.group();
	var projectsByResourceType = resourceType.group();
	var projectsByFundingStatus = fundingStatus.group();
	var projectsByPovertyLevel = povertyLevel.group();
	var stateGroup = state.group();

	var all = ndx.groupAll();

	//Calculate Groups
	var totalDonationsState = state.group().reduceSum(function(d) {
		return d.total_donations;
	});

	var totalDonationsGrade = gradeLevel.group().reduceSum(function(d) {
		return d.grade_level;
	});

	var totalDonationsFundingStatus = fundingStatus.group().reduceSum(function(d) {
		return d.funding_status;
	});



	var netTotalDonations = ndx.groupAll().reduceSum(function(d) {return d.total_donations;});

	//Define threshold values for data
    var max_state = totalDonationsState.top(1)[0].value;
	var minDate = datePosted.bottom(1)[0].date_posted;
	var maxDate = datePosted.top(1)[0].date_posted;
    var expenseColors = ["#5DA5DA ","#FAA43A ","#60BD68 ", "#F17CB0", "#B276B2" ,"#DECF3F "];
    var datecolor = ["#eb2d3a"]
    console.log(minDate);
    console.log(maxDate);

    //Charts
	var dateChart = dc.barChart("#date-chart");
	var gradeLevelChart = dc.pieChart("#grade-chart");
	var resourceTypeChart = dc.rowChart("#resource-chart");
	var fundingStatusChart = dc.pieChart("#funding-chart");
	var povertyLevelChart = dc.pieChart("#poverty-chart");
	var totalProjects = dc.numberDisplay("#total-projects");
	var netDonations = dc.numberDisplay("#net-donations");
	var stateDonations = dc.pieChart("#state-donations");
    var usChart = dc.geoChoroplethChart("#us-chart");


	totalProjects
		.formatNumber(d3.format("d"))
		.valueAccessor(function(d){return d; })
		.group(all);

	netDonations
		.formatNumber(d3.format("d"))
		.valueAccessor(function(d){return d; })
		.group(netTotalDonations)
		.formatNumber(d3.format(".3s"));

	dateChart
		.width(600)
		.height(300)
        .ordinalColors(datecolor)
		.margins({top: 10, right: 50, bottom: 30, left: 50})
		.dimension(datePosted)
		.group(projectsByDate)
		.transitionDuration(500)
		.x(d3.time.scale().domain([minDate, maxDate]))
		.elasticY(true)
        .yAxisPadding(100)
		.renderHorizontalGridLines(true)
    	.renderVerticalGridLines(true)
		.xAxisLabel("Time of Donation")
		.yAxis().ticks(6);

	resourceTypeChart
        .width(400)
        .height(220)
        .dimension(resourceType)
        .group(projectsByResourceType)
        .ordinalColors(["#56B2EA","#E064CD","#F8B700","#78CC00","#7B71C5"])
        .elasticX(true)

        .xAxis().ticks(5);


	povertyLevelChart
        .radius(100)
		.height(220)
        .innerRadius(40)
        .dimension(povertyLevel)
        .group(projectsByPovertyLevel)
        .ordinalColors(["#225ea8", "#41b6c4", "#a1dab4","#ffffcc"])
        .legend(dc.legend().x(0).y(10))
         .on('pretransition', function(chart) {
        chart.selectAll('text.pie-slice').text(function(d) {
            return dc.utils.printSingleValue((d.endAngle - d.startAngle) / (2*Math.PI) * 100) + '%';
        })
    })
         .title(function (d) {
        return "povertyLevel: " + d["key"]

    });


	gradeLevelChart
		.width(350)
        .height(220)
        .radius(100)
        .transitionDuration(1000)
        .dimension(gradeLevel)
        .group(projectsByGrade)
        .renderLabel(false)
        .ordinalColors(expenseColors)
        .legend(dc.legend().x(0).y(10))
        .label(function(d) { return  Math.floor(d.value / all.value() * 100) + "%"; });




      fundingStatusChart
        .height(220)
        .radius(90)
        .innerRadius(40)
        .transitionDuration(1000)
        .dimension(fundingStatus)
        .group(projectsByFundingStatus);


    stateDonations

        .height(220)
        .radius(90)
        .innerRadius(40)
        .transitionDuration(1000)
        .dimension(state)
        .group(totalDonationsState)
        .ordinalColors(expenseColors)
        .legend(dc.legend().x(20).y(10))


    usChart.width(700)
    .height(300)
    .dimension(state)
    .group(totalDonationsState)
     .colors(["#ccc", "#E2F2FF","#C4E4FF","#9ED2FF","#81C5FF","#6BBAFF","#51AEFF","#36A2FF","#1E96FF","#0089FF","#0061B5"])

    .colorDomain([0, max_state])
    .overlayGeoJson(statesJson["features"], "state", function (d) {
        return d.properties.name;
    })
    .projection(d3.geo.albersUsa()
                .scale(600)
                .translate([340, 150]))
    .title(function (p) {
        return "State: " + p["key"]
                + "\n"
                +"Total Donations: " + "$ " + Math.round(p["value"]);
    })




    dc.renderAll();



};