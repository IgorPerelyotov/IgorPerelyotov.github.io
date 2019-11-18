document.addEventListener("DOMContentLoaded", function(event) { 
	reset();
	initListeners()
});

var monthLimit = {
	price: 200,
	weight: 31
};

var singleLimit = {
	price: 22,
	weight: 10
};

var entered = {
	monthWeight: 0,
	monthPrice: 0,
	singleWeight: 0,
	singlePrice: 0,
}

function reset() {
	var element = document.getElementById("notax");
	element.classList.remove("green_border");
	element = document.getElementById("single");
	element.classList.remove("green_border");
	element = document.getElementById("month");
	element.classList.remove("green_border");
	element = document.getElementById("single_and_month");
	element.classList.remove("green_border");
	
	showTax();
}

function showTax() {
	if (entered.monthWeight + entered.singleWeight <= monthLimit.weight && 
		entered.monthPrice + entered.singlePrice <= monthLimit.price) {
		if (entered.singleWeight <= singleLimit.weight && 
			entered.singlePrice <= singleLimit.price) {
			var element = document.getElementById("notax");
			element.classList.add("green_border")
		} else {
			var element = document.getElementById("single");
			element.classList.add("green_border")
		}
	} else {
		if (entered.singleWeight <= singleLimit.weight && 
			entered.singlePrice <= singleLimit.price) {
			var element = document.getElementById("month");
			element.classList.add("green_border")
		} else {
			var element = document.getElementById("single_and_month");
			element.classList.add("green_border")
		}
	}
	var tax = calcTax();
	var element = document.getElementById("tax");
	element.innerHTML = tax;
}

function calcTax() {
	var result = 0.0;
	var monthWeightTax = entered.monthWeight + entered.singleWeight > monthLimit.weight ? 
		4 * (entered.monthWeight + entered.singleWeight - monthLimit.weight) : 0;
	var monthPriceTax = entered.monthPrice + entered.singlePrice > monthLimit.price ? 0.3 * (entered.singlePrice - singleLimit.price) : 0;
	var singleWeightTax = entered.singleWeight > singleLimit.weight ? 4 * (entered.singleWeight - singleLimit.weight) : 0;
	var singlePriceTax = entered.singlePrice > singleLimit.price ? 0.3 * (entered.singlePrice - singleLimit.price) : 0;
	result = Math.max(result, Math.max(monthWeightTax, monthPriceTax));
	result = Math.max(result, Math.max(singleWeightTax, singlePriceTax));
	return result;
}

function initListeners() {
	var element = document.getElementById("month_price");
	element.addEventListener('input', function (evt) {
		entered.monthPrice = parseInt(this.value);
		reset();
	});
	element = document.getElementById("month_weight");
	element.addEventListener('input', function (evt) {
		entered.monthWeight = parseInt(this.value);
		reset();
	});
	element = document.getElementById("single_price");
	element.addEventListener('input', function (evt) {
		entered.singlePrice = parseInt(this.value);
		reset();
	});
	element = document.getElementById("single_weight");
	element.addEventListener('input', function (evt) {
		entered.singleWeight = parseInt(this.value);
		reset();
	});
}