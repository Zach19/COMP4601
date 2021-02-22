import React, { useState } from 'react';


function App() {

  const [search, setSearch] = useState('');
  const [displayData, setDisplayData] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  const handleSubmit = async () => {
    fetch(`http://localhost:3000/search?q=${search}`)
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
            for (let i = 0; i < 10; i++) {
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
      {dataLoaded ? (
        <div>
          {displayData.map(data => {
           return data ?
             (
              <div>
                <div>
                  URL: https://people.scs.carleton.ca/~davidmckenney/fruitgraph/{data.ref}.html
                </div>
                <div>Title: {data.ref}</div>
                <div>Score: {data.score}</div>
                <br></br>
              </div>
            ) :  null;
          })}
        </div>
      ) : null}
    </div>
  );
}

export default App;
