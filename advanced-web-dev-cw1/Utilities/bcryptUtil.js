const bcrypt = require('bcrypt')

const generateHash = async (string) =>{
    const saltRounds = 10 //$2aod!234[hash][salt]
    const salt = await bcrypt.genSalt(saltRounds)
    return await bcrypt.hash(string, salt)
}

const verify = async (formpassword, dbpassword) =>{
    try{
        return await bcrypt.compare(formpassword, dbpassword)
    }
    catch(ex){
        console.error(ex)
    }
}


module.exports = {generateHash, verify}