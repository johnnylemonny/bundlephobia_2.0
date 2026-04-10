const fabric = require('fabric/node')
console.log('Fabric keys:', Object.keys(fabric).filter(k => k.includes('Canvas') || k.includes('Text') || k.includes('Group') || k.includes('Line')))
