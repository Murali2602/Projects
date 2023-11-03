#include <iostream>
#include <fstream>
#include <string>
using namespace std;


void encrypt(const string& fileName, const string& encryptFileName) {

    // Declaring char ch to read individual characters from file 
    char ch;

    // Declaring two objects using fstream class - fileInput for reading files and fileOutput for writing files
    fstream fileInput, fileOutput;

    fileInput.open(fileName, fstream::in);
    fileOutput.open(encryptFileName, fstream::out);
    if (fileInput.is_open()) {
        printf("[+] Encrypting file '%s'\n", fileName.c_str());
        printf("[+] Writing Contents to '%s'\n", encryptFileName.c_str());
        // File is open and ready for reading
        // Replace characters of file by 100
        while(fileInput>>noskipws>>ch)
    {
        ch = ch+100;
        fileOutput<<ch;
        
    }
        fileInput.close();
        fileOutput.close();
    } else {
        // Handle the case where the file couldn't be opened
        printf("Failed to open the file '%s'\n", fileName.c_str());
    }

}

void decrypt(const string& fileName, const string& decryptFileName) {

    // Declaring char ch to read individual characters from file 
    char ch;

    // Declaring two objects using fstream class - fileInput for reading files and fileOutput for writing files
    fstream fileInput, fileOutput;

    fileInput.open(fileName, fstream::in);
    fileOutput.open(decryptFileName, fstream::out);
    if (fileInput.is_open()) {
        printf("[+] Decrypting file '%s'\n", fileName.c_str());
        printf("[+] Writing Contents to '%s'\n", decryptFileName.c_str());
        // File is open and ready for reading
        // Replace characters of file by 100
        while(fileInput>>noskipws>>ch)
    {
        ch = ch-100;
        fileOutput<<ch;
        
    }
        fileInput.close();
        fileOutput.close();
    } else {
        // Handle the case where the file couldn't be opened
        printf("Failed to open the file '%s'\n", fileName.c_str());
    }
}


int main(int argc, char const *argv[])
{
    if (argc > 1) {
        string arg = argv[1]; 
        if (arg == "encrypt") {
            // Ask the user for File Name
            cout << "Enter the file name: ";
            string fileName;
            // Store the User Input into fileName string
            getline(cin, fileName);
            string encryptFileName = "encrypt_" + fileName;
            encrypt(fileName, encryptFileName);
            return 0;
        } else if ( arg == "decrypt") {
            // Ask the user for File Name
            cout << "Enter the file name: ";
            string fileName;
            // Store the User Input into fileName string
            getline(cin, fileName);
            string decryptFileName = "decrypt_" + fileName;
            // Check if file has 'encrypt_' in its name and replace with 'decrypt_' if it does  
            if (fileName.compare(0, 8, "encrypt_") == 0) {
                decryptFileName = "decrypt_" + fileName.substr(8);
            } else {
                decryptFileName = "decrypt_" + fileName;
            }
            decrypt(fileName, decryptFileName);
            return 0;
        } 
    }
        cout << "Usage: ./main <encrypt> <decrypt>" << endl;
        return 1;    
}
    
