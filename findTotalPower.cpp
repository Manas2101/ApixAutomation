#include <bits/stdc++.h>
using namespace std;

/*
 * Complete the 'findTotalPower' function below.
 *
 * The function is expected to return an INTEGER.
 * The function accepts INTEGER_ARRAY power as parameter.
 */

const long long MOD = 1000000007;

int findTotalPower(vector<int> power) {
    int n = power.size();
    long long totalPower = 0;
    
    // Iterate through all possible contiguous groups [l, r]
    // where l is the left index and r is the right index
    for (int l = 0; l < n; l++) {
        for (int r = l; r < n; r++) {
            // Find minimum power in the range [l, r]
            int minPower = power[l];
            for (int i = l; i <= r; i++) {
                minPower = min(minPower, power[i]);
            }
            
            // Calculate sum of powers in the range [l, r]
            long long sumPower = 0;
            for (int i = l; i <= r; i++) {
                sumPower += power[i];
            }
            
            // Power[l,r] = min(power[i]) * sum(power[i]) for i in [l, r]
            long long groupPower = ((long long)minPower * sumPower) % MOD;
            
            // Add to total power
            totalPower = (totalPower + groupPower) % MOD;
        }
    }
    
    return (int)totalPower;
}

int main() {
    // Example test case
    vector<int> power = {2, 3, 2, 1};
    
    int result = findTotalPower(power);
    
    cout << "Result: " << result << endl;
    
    return 0;
}
