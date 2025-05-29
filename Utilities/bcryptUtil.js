const bcrypt = require('bcrypt')

const generateHash = async (string) =>{
    const saltRounds = 10 //$2aod!234[hash][salt]
    const salt = await bcrypt.genSalt(saltRounds)
    const hashedpassword = await bcrypt.hash(string, salt)
    return hashedpassword
}

const verify = async (formpassword, dbpassword) =>{
    try{
        const isMatch = await bcrypt.compare(formpassword, dbpassword)
        return isMatch
    }
    catch(ex){
        console.error(ex)
    }
}


module.exports = {generateHash, verify}