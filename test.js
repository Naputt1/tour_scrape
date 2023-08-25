const fs = require('fs');

// const input = "ทัวร์ญี่ปุ่น (344)";
// const regex = /(.+)\s+\((\d+)\)/;
// const match = input.match(regex);

// if (match) {
//   const result = [match[1], match[2]];
//   console.log(result); // Output: ["ทัวร์ญี่ปุ่น", "344"]
// } else {
//   console.log("No match found.");
// }


// console.log(JSON.parse("jfoefej", null, 2));




fs.access("uniThai.json", fs.constants.F_OK, (err) => {
  if (err) {
    // File does not exist
    console.error("File does not exist");
  } else {
    // File exists, read the file
    fs.readFile("uniThai.json", "utf8", (err, data) => {
      if (err) {
        console.error("Error reading file:", err);
      } else {
        console.log("File content:", data);

        // Object.keys(data).forEach(key => {
        //   console.log(key)
        // })
      }
    });
  }
});

console.log(JSON.parse('"[\"นอร์เวย์"\,\"ฟินแลนด์"\,\"สวีเดน"\,\"เดนมาร์ค"\]"'));