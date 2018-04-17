let orderBook = [];

getCommands = () => { // Loads commands from a file
    let inputFile = document.querySelector('#input-file').value;
    return fetch(inputFile)
        .then(resp => {
            if (resp.status !== 200) {
                console.log('Looks like there was a problem. Status Code: ' + resp.status);
                return;
            }
            return resp.text()
        })
        .then(resp => {
            return resp.split(/\r?\n/)
        });
};

document.querySelector('#start').addEventListener('click', e => { // Start button handler, launches commands execution
    e.preventDefault();
    let line = 1;
    getCommands().then(commands =>{
        commands.forEach(el => {
            command(el, line);
            if (validate(el, line)) {
                let command = el.split(',');
                command.unshift(line);
                self[command[1]](command)
            } else {
                output("Not a valid command", line, true)
            }
            line++
        });
        printBook();
    })
});


let currentCommand = 0;

document.querySelector('#trace').addEventListener('click', e => { // Trace button handler, lets execute command one by one
    e.preventDefault();
    getCommands().then(commands => {
        if (commands.length > currentCommand) {
            let el = commands[currentCommand];
            let line = currentCommand + 1;
            command(el, line);
            if (validate(el, line)) {
                let command = el.split(',');
                command.unshift(line);
                self[command[1]](command)
            } else {
                output("Not a valid command", line, true)
            }
            currentCommand++;
            printBook();
        }
    });

});


validate = (el) => { // Checks command validity
    return (/^u,[0-9]+,[0-9]+,bid|ask/.test(el) || /^o,buy|sell,[0-9]+/.test(el) || /^q,best_bid|best_ask|size,*[0-9]*/.test(el));
};

u = args => { // Implements "u" command for manipulating Order Book data
    let line = args.shift();
    args[1] = parseInt(args[1]);
    args[2] = parseInt(args[2]);
    let index = bookSearch(args[1]);
    if (index !== false) orderBook.splice(index, 1);

    orderBook.push([args[1], args[2], args[3]]);
    orderBook.sort((a, b) => {
        return (a[0] > b[0]) ? 1 : ((b[0] > a[0]) ? -1 : 0);
    });

};

q = args => { // Implements "q" command, returns responses on queries
    let line = args.shift();

    if (args[1] == 'best_bid'){
        if(bestPrice('bid').ok) {
            let index = bestPrice('bid').resp;
            if (typeof index === 'number') {
                output(orderBook[index][0] + ',' + orderBook[index][1], line)
            } else {
                output(index, line, true)
            }

        }
    }

    if (args[1] == 'best_ask'){
        if(bestPrice('ask').ok) {
            let index = bestPrice('ask').resp;
            if (typeof index === 'number'){
                output(orderBook[index][0] + ',' + orderBook[index][1], line)
            }else {
                output(index, line, true)
            }
        }
    }

    if (args[1] == 'size'){
        let price = parseInt(args[2]);
        if (bookSearch(price) !== false) {
            output(orderBook[bookSearch(price)][1], line)
        } else {
            output("There aren't orders with a such price", line, true)
        }
    }
};

o = args => { // Implements "o" command of buying and selling units
    let line = args.shift();
    args[2] = parseInt(args[2]);

    if (args[1] === 'sell') {
        let toSell = args[2];
        while (toSell > 0) {
            if (bestPrice('bid').ok) {
                let index = bestPrice('bid').resp;
                toSell = toSell - orderBook[index][1]
                if (toSell < 0) {
                    orderBook[index][1] = - toSell
                } else {
                    orderBook.splice(index, 1)
                }
            } else output("Not enough amount to sell. Remains " + toSell + " to sell", line, true);
        }
    }

    if (args[1] === 'buy') {
        let toBuy = args[2];
        while (toBuy > 0) {
            if (bestPrice('ask').ok) {
                let index = bestPrice('ask').resp;
                toBuy = toBuy - orderBook[index][1]
                if (toBuy < 0) {
                    orderBook[index][1] = - toBuy
                } else {
                    orderBook.splice(index, 1)
                }
            } else output("Not enough amount to buy. Remains " + toBuy + " to buy", line, true);
        }
    }
};

exist = obj => { // Checks object on existence
    return (typeof obj !== 'undefined');
};

bookSearch = price => { // Searches for index of Order Book entry with specified price
    for (let i=0; i<orderBook.length; i++){
        if (orderBook[i][0] === price) {
            return i;
        }
    }
    return false;
};

bestPrice = (order) => { // Searches for best price for specified type of order
    if (exist(orderBook[0])) {
        let bid_index = 0;
        while (exist(orderBook[bid_index]) && orderBook[bid_index][2] === 'bid') {
            bid_index++;
        }
        let ask_index = bid_index;
        while (exist(orderBook[ask_index]) && orderBook[ask_index][2] !== 'ask') {
            ask_index++;
        }
        let ok = true;
        if (order === 'bid') {
            if (!exist(orderBook[bid_index]) || bid_index === 0){
                ok = false;
                bid_index = "There aren't BID orders";
            } else bid_index = bid_index - 1;
            return {'ok': ok, 'resp': bid_index}
        }
        if (order === 'ask') {
            if (!exist(orderBook[ask_index])){
                ok = false;
                ask_index = "There aren't ASK orders";
            }
            return {'ok': ok, 'resp': ask_index}
        }

    } else {
        return {'ok': false, 'ask': "The OrderBook is empty or corrupted"};
    }
};

output = (message, line, error = false) => { // Displays command output
    let newMessage = document.createElement('p');
    newMessage.innerHTML = '<span class="line">[' + leftPad(line, 2) + ']</span>' + message;
    if (error) {
        newMessage.classList.add('error');
    }

    let outputBlock = document.querySelector('#output');
    outputBlock.appendChild(newMessage)
};

command = (command, line) => { // Displays commands
    let newMessage = document.createElement('p');
    newMessage.innerHTML = '<span class="line">[' +  leftPad(line, 2) + ']</span>' + command;

    let outputBlock = document.querySelector('#commands');
    outputBlock.appendChild(newMessage)
};

printBook = () => { // Displays Order Book
    const htmlHead = "<table><tr><th>price</th><th>size</th><th>order</th></tr>";
    const htmlFoot = "</table>";
    let html = "";
    orderBook.forEach(el => {
        html += "<tr><td>" + el[0] + "</td><td>" + el[1] + "</td><td>" + el[2] + "</td></tr>"
    });
    document.getElementById('orderBook').innerHTML = htmlHead + html +htmlFoot
};

leftPad = (number, targetLength) => {
    let output = number + '';
    while (output.length < targetLength) {
        output = '0' + output;
    }
    return output;
}