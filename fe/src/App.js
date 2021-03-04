import React, { useState } from 'react';


function App() {

  const [search, setSearch] = useState('');
  const [displayData, setDisplayData] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [fruitSearch, setFruitSearch] = useState(true)
  const [personalSearch, setPersonalSearch] = useState(false)
  const [boosted, setBoosted] = useState(false)
  const [selectValue, setSelectValue] = useState(10)
  
  const handleSubmit = async () => {

    let fetchURL;
    if (fruitSearch) {
      fetchURL = `http://localhost:3000/fruits?q=${search}`
    }
    else {
      fetchURL = `http://localhost:3000/personal?q=${search}`
    }
    if (boosted) {
      fetchURL += '&b=true'
    }
    fetchURL += `&limit=${selectValue}`

    fetch(fetchURL)
          .then(response => response.body)
          .then(rb => {
            const reader = rb.getReader();

            return new ReadableStream({
              start(controller) {
                // The following function handles each data chunk
                function push() {
                  // "done" is a Boolean and value a "Uint8Array"
                  reader.read().then( ({done, value}) => {
                    // If there is no more data to read
                    if (done) {
                      controller.close();
                      return;
                    }
                    // Get the data and send it to the browser via the controller
                    controller.enqueue(value);
                    // Check chunks by logging to the console
                    push();
                  })
                }

                push();
              }
            });
          })
          .then(stream => {
            // Respond with our stream
            return new Response(stream, { headers: { "Content-Type": "application/json" } }).json();
          })
          .then(result => {
            // Do things with result
            console.log(result)
            for (let i = 0; i < selectValue; i++) {
              setDisplayData(displayData => [...displayData, result[i]])
            }
            setDataLoaded(true)
          });
  }

  return (
    <div className="App">
      <div>Search:</div>
      <input 
        onChange={e => setSearch(e.target.value)}
      />
      <button
        onClick={() => {
          setDisplayData([])
          setDataLoaded(false)
          handleSubmit()
        }}
      >Search</button>
      <div>
        <div>
          <input type="radio" id="fruits" name="search" value="fruits" checked={fruitSearch}
                  onClick={() => {
                    setFruitSearch(!fruitSearch)
                    setPersonalSearch(!personalSearch)
                  }} />
          <label for="fruitSearch">Fruit search</label>
        </div>
        <div>
          <input type="radio" id="personal" name="search" value="personal" checked={personalSearch}
                  onClick={() => {
                    setFruitSearch(!fruitSearch)
                    setPersonalSearch(!personalSearch)
                  }} />
          <label for="personalSearch">Personal search</label>
        </div>
        <div>
          <input type="checkbox" checked={boosted} onClick={() => setBoosted(!boosted)} />
          <label>Boost page rank</label>
        </div>
        <div>
          <select value={selectValue} onChange={e => setSelectValue(e.target.value)}>
            <option value={1}>1</option>
            <option value={10}>10</option>
            <option value={50}>50</option>
          </select>
        </div>
        <br></br>
      </div>
      {displayData[0] ? (
        <div>
          {displayData.map(data => {
           return data ?
             (
              <div>
                <div>
                  URL: https://people.scs.carleton.ca/~davidmckenney/fruitgraph/{data.ref}.html
                </div>
                <div>Title: {data.title}</div>
                <div>Page rank: {data.pageRank.$numberDecimal}</div>
                <div>Incoming Links: {data.incomingLinks}</div>
                <div>Outgoing Links: {data.outgoingLinks}</div>
                <br></br>
              </div>
            ) :  null;
          })}
        </div>
      ) : <div>No search results found</div>}
    </div>
  );
}

export default App;
