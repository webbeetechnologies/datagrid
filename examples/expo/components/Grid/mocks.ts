type ManipulateOutputObject<T = any> = (i: number) => T;

export const generateFlatListData = (
    dataLength: number,
    manipulateOutputObj: ManipulateOutputObject = i => ({
        id: i,
        title: `item ${i}`,
    }),
): ReturnType<typeof manipulateOutputObj>[] => {
    // Create an empty array
    const arr: ReturnType<typeof manipulateOutputObj>[] = [];

    // Loop n times
    for (let i = 0; i < dataLength; i++) {
        // Create an object with the unique id, title, and data properties
        const obj = manipulateOutputObj(i);

        // Push the object into the array
        arr.push(obj);
    }

    // Return the array
    return arr;
};

// const getRowType = (i: number) => {
//     switch (i) {
//         case 0:
//         case 200:
//         case 400:
//         case 600:
//         case 800:
//         case 1000:
//         case 1200:
//         case 1400:
//         case 1600:
//         case 1800:
//             return 'group-header';
//         case 199:
//         case 399:
//         case 599:
//         case 799:
//         case 999:
//         case 1199:
//         case 1399:
//         case 1599:
//         case 1799:
//         case 1999:
//             return 'group-footer';
//         default:
//             return 'data';
//     }
// };

export const records = (() => {
    const _records: Record<string, any>[] = [];

    for (let i = 0; i < 2000; i++) {
        const obj: Record<string | number, string> = {
            _id: `${i}`,
            _rowType: 'data',
        };

        for (let j = 0; j < 30; j++) {
            obj[j] = `row-${i} col-${j}`;
        }

        _records.push(obj);
    }

    return _records;
})();
