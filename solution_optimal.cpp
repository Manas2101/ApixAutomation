#include <bits/stdc++.h>
using namespace std;

const long long MOD = 1000000007;

/*
 * OPTIMAL O(n) Solution using Contribution Technique
 * 
 * For each element power[i], calculate how much it contributes to the answer
 * when it acts as the minimum in various subarrays.
 * 
 * Key Formula:
 * For element at index i with boundaries [left, right]:
 * - Contribution = power[i] × (sum of all subarray sums where power[i] is min)
 * 
 * Time: O(n), Space: O(n)
 */

int findTotalPower(vector<int> power) {
    int n = power.size();
    long long result = 0;
    
    // Find previous and next smaller elements using monotonic stack
    vector<int> prevSmaller(n), nextSmaller(n);
    stack<int> st;
    
    // Previous smaller element (or -1)
    for (int i = 0; i < n; i++) {
        while (!st.empty() && power[st.top()] >= power[i]) {
            st.pop();
        }
        prevSmaller[i] = st.empty() ? -1 : st.top();
        st.push(i);
    }
    
    while (!st.empty()) st.pop();
    
    // Next smaller element (or n)
    for (int i = n - 1; i >= 0; i--) {
        while (!st.empty() && power[st.top()] > power[i]) {
            st.pop();
        }
        nextSmaller[i] = st.empty() ? n : st.top();
        st.push(i);
    }
    
    // For each element, calculate its contribution
    for (int i = 0; i < n; i++) {
        int left = prevSmaller[i];
        int right = nextSmaller[i];
        
        // Number of subarrays where power[i] is minimum
        long long leftCount = i - left;      // Choices for left boundary
        long long rightCount = right - i;    // Choices for right boundary
        
        // Calculate sum of all subarray sums where power[i] is minimum
        // Formula: For each subarray [l, r] where l in (left, i] and r in [i, right):
        // Sum contribution = Σ(l=left+1 to i) Σ(r=i to right-1) Σ(k=l to r) power[k]
        
        long long sumOfSums = 0;
        
        // Contribution from power[i] itself
        long long selfContribution = ((long long)power[i] * leftCount % MOD * rightCount % MOD) % MOD;
        sumOfSums = (sumOfSums + selfContribution) % MOD;
        
        // Contribution from elements to the left of i
        for (int j = left + 1; j < i; j++) {
            // How many times does power[j] appear in subarrays where power[i] is min?
            // Left boundary: (left, j] -> (j - left) choices
            // Right boundary: [i, right) -> (right - i) choices
            long long count = ((long long)(j - left) * (right - i)) % MOD;
            long long contribution = (count * power[j]) % MOD;
            sumOfSums = (sumOfSums + contribution) % MOD;
        }
        
        // Contribution from elements to the right of i
        for (int j = i + 1; j < right; j++) {
            // Left boundary: (left, i] -> (i - left) choices
            // Right boundary: [j, right) -> (right - j) choices
            long long count = ((long long)(i - left) * (right - j)) % MOD;
            long long contribution = (count * power[j]) % MOD;
            sumOfSums = (sumOfSums + contribution) % MOD;
        }
        
        // Total contribution = power[i] * sumOfSums
        long long totalContribution = ((long long)power[i] * sumOfSums) % MOD;
        result = (result + totalContribution) % MOD;
    }
    
    return (int)result;
}

int main() {
    vector<int> power = {2, 3, 2, 1};
    
    int result = findTotalPower(power);
    
    cout << "Input: [2, 3, 2, 1]" << endl;
    cout << "Output: " << result << endl;
    cout << "Expected: 69" << endl;
    
    // Additional test
    vector<int> power2 = {1, 2, 3};
    cout << "\nTest 2: " << findTotalPower(power2) << endl;
    
    return 0;
}
